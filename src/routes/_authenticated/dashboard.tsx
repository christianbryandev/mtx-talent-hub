import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Building2,
  ListChecks,
  TrendingUp,
  Activity,
  Calendar,
  Clock,
  Target,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import {
  MEETING_TYPE_COLOR,
  MEETING_TYPE_LABELS,
  type Meeting,
} from "@/types/meetings";
import { cn } from "@/lib/utils";
import { ComercialDashboard } from "@/components/dashboard/ComercialDashboard";
import { ColaboradorDashboard } from "@/components/dashboard/ColaboradorDashboard";
import { TodayMeetingBanner } from "@/components/dashboard/TodayMeetingBanner";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MTX Hub" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { isAdmin, isComercial, hasRole, loading } = usePermissions();

  if (loading) return null;
  if (!isAdmin && isComercial) return <ComercialDashboard />;
  if (!isAdmin && hasRole("colaborador")) return <ColaboradorDashboard />;

  return <AdminDashboardContent />;
}

function AdminDashboardContent() {
  const { isAdmin } = usePermissions();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5)).toISOString();
      const today = new Date().toISOString().slice(0, 10);

      const [
        youngsRes,
        clientsRes,
        openTasksRes,
        clientsHistoryRes,
        opportunitiesRes,
        overdueTasksRes,
        upcomingMeetingsRes,
        upcomingTasksRes,
        logsRes,
      ] = await Promise.all([
        supabase.from("young_people").select("id, status, has_cnpj, first_client_attended, total_income_generated, trail_phase"),
        supabase.from("clients").select("id, status, monthly_value, created_at"),
        supabase.from("tasks").select("id, kanban_column").not("kanban_column", "in", "(concluido)"),
        supabase.from("clients").select("created_at").gte("created_at", sixMonthsAgo),
        supabase.from("opportunities").select("id, status, estimated_value, next_followup_date"),
        supabase.from("tasks").select("id").lt("due_date", today).not("kanban_column", "in", "(concluido)"),
        supabase.from("meetings").select("*").eq("status", "agendada").gte("date", today).order("date").limit(5),
        supabase.from("tasks").select("id, title, due_date, kanban_column").not("kanban_column", "in", "(concluido)").not("due_date", "is", null).order("due_date").limit(5),
        supabase.from("activity_logs").select("id, action, description, created_at, user_id").order("created_at", { ascending: false }).limit(10),
      ]);

      const youngs = youngsRes.data ?? [];
      const clients = clientsRes.data ?? [];

      const activeYoungs = youngs.filter((y) => y.status === "ativo").length;
      const activeClients = clients.filter((c) => c.status === "ativo").length;
      const recurringRevenue = clients
        .filter((c) => c.status === "ativo")
        .reduce((sum, c) => sum + (Number(c.monthly_value) || 0), 0);
      const youngsWithCnpj = youngs.filter((y) => y.has_cnpj).length;
      const remunerated = youngs.filter((y) => y.first_client_attended).length;
      const avgIncome = youngs.length
        ? youngs.reduce((s, y) => s + (Number(y.total_income_generated) || 0), 0) / youngs.length
        : 0;

      const opportunities = opportunitiesRes.data ?? [];
      const openOpportunities = opportunities.filter((o) => o.status === "aberta").length;
      const pipelineValue = opportunities
        .filter((o) => o.status === "aberta")
        .reduce((s, o) => s + (Number(o.estimated_value) || 0), 0);
      const overdueFollowups = opportunities.filter(
        (o) => o.status === "aberta" && o.next_followup_date && o.next_followup_date < today,
      ).length;

      // clients per month (6 months)
      const monthMap = new Map<string, number>();
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        monthMap.set(format(d, "yyyy-MM"), 0);
      }
      for (const c of clientsHistoryRes.data ?? []) {
        const key = c.created_at.slice(0, 7);
        if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
      }
      const clientsByMonth = Array.from(monthMap.entries()).map(([k, v]) => ({
        mes: format(parseISO(k + "-01"), "MMM", { locale: ptBR }),
        clientes: v,
      }));

      // Trail phase distribution
      const trailMap = new Map<string, number>();
      for (const y of youngs) {
        if (!y.trail_phase) continue;
        trailMap.set(y.trail_phase, (trailMap.get(y.trail_phase) ?? 0) + 1);
      }
      const trailData = Array.from(trailMap.entries()).map(([fase, total]) => ({ fase, total }));

      return {
        activeYoungs,
        activeClients,
        openTasks: openTasksRes.data?.length ?? 0,
        recurringRevenue,
        youngsWithCnpj,
        remunerated,
        avgIncome,
        openOpportunities,
        pipelineValue,
        overdueFollowups,
        overdueTasks: overdueTasksRes.data?.length ?? 0,
        clientsByMonth,
        trailData,
        upcomingMeetings: (upcomingMeetingsRes.data ?? []) as Meeting[],
        upcomingTasks: upcomingTasksRes.data ?? [],
        activityLogs: logsRes.data ?? [],
      };
    },
  });

  const fmt = (n: number) => `R$ ${(n / 1000).toFixed(1)}k`;
  const fmtFull = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Visão geral</h2>
          <p className="mt-1 text-sm text-muted-foreground">Resumo executivo da operação MTX</p>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Jovens ativos" value={isLoading ? "..." : stats!.activeYoungs} icon={<Users className="h-5 w-5" />} accent="primary" />
        <KpiCard label="Clientes ativos" value={isLoading ? "..." : stats!.activeClients} icon={<Building2 className="h-5 w-5" />} accent="info" />
        <KpiCard label="Tarefas em aberto" value={isLoading ? "..." : stats!.openTasks} icon={<ListChecks className="h-5 w-5" />} accent="warning" />
        {isAdmin && (
          <KpiCard label="Faturamento recorrente" value={isLoading ? "..." : fmt(stats!.recurringRevenue)} icon={<TrendingUp className="h-5 w-5" />} accent="success" />
        )}
      </div>

      {/* Impacto */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Impacto social</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Jovens remunerados" value={isLoading ? "..." : stats!.remunerated} icon={<Users className="h-5 w-5" />} accent="success" />
          <KpiCard label="Com CNPJ" value={isLoading ? "..." : stats!.youngsWithCnpj} icon={<Building2 className="h-5 w-5" />} accent="info" />
          <KpiCard label="Renda média / jovem" value={isLoading ? "..." : fmtFull(stats!.avgIncome)} icon={<TrendingUp className="h-5 w-5" />} accent="primary" />
          <KpiCard label="Tarefas atrasadas" value={isLoading ? "..." : stats!.overdueTasks} icon={<AlertCircle className="h-5 w-5" />} accent="warning" />
        </div>
      </div>

      {/* Comercial */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Comercial</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Oportunidades abertas" value={isLoading ? "..." : stats!.openOpportunities} icon={<Target className="h-5 w-5" />} accent="primary" />
          <KpiCard label="Valor em pipeline" value={isLoading ? "..." : fmt(stats!.pipelineValue)} icon={<TrendingUp className="h-5 w-5" />} accent="info" />
          <KpiCard label="Follow-ups atrasados" value={isLoading ? "..." : stats!.overdueFollowups} icon={<AlertCircle className="h-5 w-5" />} accent="warning" />
          <KpiCard label="Próximas reuniões" value={isLoading ? "..." : stats!.upcomingMeetings.length} icon={<Calendar className="h-5 w-5" />} accent="primary" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Jovens por fase da trilha</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : stats!.trailData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados ainda</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats!.trailData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="fase" stroke="#A1A1AA" fontSize={11} />
                  <YAxis stroke="#A1A1AA" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#11111A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "white" }} />
                  <Bar dataKey="total" fill="#EC4899" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Evolução de clientes (6 meses)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats!.clientsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="mes" stroke="#A1A1AA" fontSize={11} />
                  <YAxis stroke="#A1A1AA" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#11111A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "white" }} />
                  <Line type="monotone" dataKey="clientes" stroke="#EC4899" strokeWidth={2.5} dot={{ fill: "#EC4899", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Listas */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> Atividade recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : stats!.activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
            ) : (
              stats!.activityLogs.map((a) => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-foreground">{a.description ?? a.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(a.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" /> Próximas reuniões
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : stats!.upcomingMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma reunião agendada.</p>
            ) : (
              stats!.upcomingMeetings.map((m) => (
                <Link
                  key={m.id}
                  to="/reunioes/$id"
                  params={{ id: m.id }}
                  className="flex items-start justify-between gap-2 text-sm hover:underline"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(m.date), "dd/MM", { locale: ptBR })}
                      {m.start_time && ` · ${m.start_time.slice(0, 5)}`}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("border text-[10px]", MEETING_TYPE_COLOR[m.type])}>
                    {MEETING_TYPE_LABELS[m.type]}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" /> Tarefas com prazo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : stats!.upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa com prazo.</p>
            ) : (
              stats!.upcomingTasks.map((t) => {
                const overdue = t.due_date && t.due_date < new Date().toISOString().slice(0, 10);
                return (
                  <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-foreground">{t.title}</span>
                    <Badge variant={overdue ? "destructive" : "secondary"} className="text-xs">
                      {t.due_date && format(parseISO(t.due_date), "dd/MM")}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
