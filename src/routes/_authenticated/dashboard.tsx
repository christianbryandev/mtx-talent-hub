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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, parseISO, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
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
import { JovemAprendizDashboard } from "@/components/dashboard/JovemAprendizDashboard";
import { TodayMeetingBanner } from "@/components/dashboard/TodayMeetingBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "@/components/dashboard/pulse-theme.css";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MTX Hub" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { isAdmin, isComercial, isJovemAprendiz, isCliente, loading } = usePermissions();

  if (loading) return null;

  const defaultTab = isAdmin ? "admin" : isComercial ? "comercial" : isJovemAprendiz ? "jovem" : isCliente ? "cliente" : "";

  return (
    <div className="pulse-dashboard-theme w-full">
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="mb-6">
          {isAdmin && <TabsTrigger value="admin">Administração</TabsTrigger>}
          {isComercial && <TabsTrigger value="comercial">Comercial</TabsTrigger>}
          {isJovemAprendiz && <TabsTrigger value="jovem">Jovem Aprendiz</TabsTrigger>}
          {isCliente && <TabsTrigger value="cliente">Cliente</TabsTrigger>}
        </TabsList>

        {isAdmin && (
          <TabsContent value="admin" className="mt-0">
            <AdminDashboardContent />
          </TabsContent>
        )}
        
        {isComercial && (
          <TabsContent value="comercial" className="mt-0">
            <ComercialDashboard />
          </TabsContent>
        )}
        
        {isJovemAprendiz && (
          <TabsContent value="jovem" className="mt-0">
            <JovemAprendizDashboard />
          </TabsContent>
        )}

        {isCliente && (
          <TabsContent value="cliente" className="mt-0">
            <ClienteDashboardContent />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function AdminDashboardContent() {
  const { isAdmin } = usePermissions();
  useRealtimeInvalidate("opportunities", [["dashboard-stats"]]);
  useRealtimeInvalidate("tasks", [["dashboard-stats"]]);
  useRealtimeInvalidate("clients", [["dashboard-stats"]]);
  useRealtimeInvalidate("young_people", [["dashboard-stats"]]);

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
        appsRes,
        rolesRes,
        clientServicesRes,
      ] = await Promise.all([
        supabase.from("young_people").select("id, status, has_cnpj, first_client_attended, total_income_generated, trail_phase, profile_id").limit(3000),
        supabase.from("clients").select("id, status, monthly_value, created_at").limit(3000),
        supabase.from("tasks").select("id, kanban_column").not("kanban_column", "in", "(concluido)").limit(3000),
        supabase.from("clients").select("created_at").gte("created_at", sixMonthsAgo).limit(3000),
        supabase.from("opportunities").select("id, status, estimated_value, next_followup_date").limit(3000),
        supabase.from("tasks").select("id").lt("due_date", today).not("kanban_column", "in", "(concluido)").limit(3000),
        supabase.from("meetings").select("*").eq("status", "agendada").gte("date", today).order("date").limit(5),
        supabase.from("tasks").select("id, title, due_date, kanban_column").not("kanban_column", "in", "(concluido)").not("due_date", "is", null).order("due_date").limit(5),
        supabase.from("activity_logs").select("id, action, description, created_at, user_id").order("created_at", { ascending: false }).limit(10),
        supabase.from("young_applications").select("status").limit(2000),
        supabase.from("user_roles").select("user_id, role").limit(5000),
        supabase.from("client_services").select("client_id, billing_type, monthly_value, total_value, status, executor_id").eq("status", "ativo").limit(5000),
      ]);

      const rawYoungs = youngsRes.data ?? [];
      const clients = clientsRes.data ?? [];
      
      const roleMap = new Map<string, string>();
      rolesRes.data?.forEach(r => roleMap.set(r.user_id, r.role));

      // Filter out users who are explicitly classified as something else (e.g. "cliente")
      const youngs = rawYoungs.filter(y => {
        if (!y.profile_id) return true;
        const role = roleMap.get(y.profile_id);
        if (role === "cliente") return false;
        return !role || role === "jovem_aprendiz" || role === "comercial";
      });

      const activeYoungs = youngs.filter((y) => !["desligado", "reprovado", "cancelada"].includes(y.status)).length;
      const activeClients = clients.filter((c) => c.status === "ativo" || c.status === "onboarding").length;

      // Calcular faturamento a partir de client_services
      const activeClientIds = new Set(clients.filter((c) => c.status === "ativo" || c.status === "onboarding").map((c) => c.id));
      const activeServices = (clientServicesRes.data ?? []).filter((cs: any) => activeClientIds.has(cs.client_id));

      // Valor Total: soma de todos os serviços ativos de clientes ativos
      // Para pontuais, usa total_value (valor cheio); para mensais, usa monthly_value
      const totalRevenue = activeServices.reduce((sum, cs: any) => {
        const value = cs.billing_type === "pontual"
          ? (Number(cs.total_value) || Number(cs.monthly_value) || 0)
          : (Number(cs.monthly_value) || 0);
        return sum + value;
      }, 0);

      // Faturamento Recorrente: mensais + parcela mensal dos pontuais parcelados (exclui pontual à vista)
      const recurringRevenue = activeServices
        .filter((cs: any) => {
          if (cs.billing_type !== "pontual") return true; // mensal = sempre recorrente
          // Pontual parcelado: monthly_value < total_value
          return cs.total_value && Number(cs.monthly_value) < Number(cs.total_value);
        })
        .reduce((sum, cs: any) => sum + (Number(cs.monthly_value) || 0), 0);

      // Receita do Mês: mensais + parcela do mês vigente dos pontuais parcelados
      const monthlyIncome = activeServices.reduce((sum, cs: any) => {
        if (cs.billing_type !== "pontual") {
          // Serviço mensal: soma o valor mensal
          return sum + (Number(cs.monthly_value) || 0);
        }
        // Serviço pontual parcelado: soma o valor da parcela (monthly_value = total / parcelas)
        const totalVal = Number(cs.total_value) || 0;
        const monthlyVal = Number(cs.monthly_value) || 0;
        if (totalVal > 0 && monthlyVal > 0 && monthlyVal < totalVal) {
          return sum + monthlyVal;
        }
        return sum;
      }, 0);
      const youngsWithCnpj = youngs.filter((y) => y.has_cnpj).length;

      // Jovens remunerados: contar jovens que realmente têm serviços ativos vinculados a clientes existentes
      const allActiveServices = clientServicesRes.data ?? [];
      const existingClientIds = new Set(clients.map((c) => c.id));
      const youngIdsWithActiveClients = new Set(
        allActiveServices
          .filter((cs: any) => cs.executor_id && existingClientIds.has(cs.client_id))
          .map((cs: any) => cs.executor_id),
      );
      const remunerated = youngs.filter((y) => youngIdsWithActiveClients.has(y.id)).length;

      // Renda média: calcular a partir dos serviços ativos reais
      const revenueByYoung = new Map<string, number>();
      allActiveServices
        .filter((cs: any) => cs.executor_id && existingClientIds.has(cs.client_id))
        .forEach((cs: any) => {
          const value = Number(cs.total_value) || Number(cs.monthly_value) || 0;
          revenueByYoung.set(cs.executor_id, (revenueByYoung.get(cs.executor_id) ?? 0) + value);
        });
      const avgIncome = revenueByYoung.size > 0
        ? [...revenueByYoung.values()].reduce((s, v) => s + v, 0) / revenueByYoung.size
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

      // Apps status distribution
      const appStatusMap = new Map<string, number>();
      for (const a of appsRes.data ?? []) {
        const label = a.status === "pendente" ? "Pendente" : a.status === "em_analise" ? "Analisando" : a.status === "aprovado" ? "Aprovado" : "Reprovado";
        appStatusMap.set(label, (appStatusMap.get(label) ?? 0) + 1);
      }
      const appStatusData = Array.from(appStatusMap.entries()).map(([name, value]) => ({ name, value }));

      return {
        activeYoungs,
        activeClients,
        openTasks: openTasksRes.data?.length ?? 0,
        recurringRevenue,
        totalRevenue,
        monthlyIncome,
        youngsWithCnpj,
        remunerated,
        avgIncome,
        openOpportunities,
        pipelineValue,
        overdueFollowups,
        overdueTasks: overdueTasksRes.data?.length ?? 0,
        clientsByMonth,
        trailData,
        appStatusData,
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

      <TodayMeetingBanner />

      {/* KPIs principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Jovens ativos" value={isLoading || !stats ? "..." : stats.activeYoungs} icon={<Users className="h-5 w-5" />} accent="primary" />
        <KpiCard label="Clientes ativos" value={isLoading || !stats ? "..." : stats.activeClients} icon={<Building2 className="h-5 w-5" />} accent="info" />
        <KpiCard label="Tarefas em aberto" value={isLoading || !stats ? "..." : stats.openTasks} icon={<ListChecks className="h-5 w-5" />} accent="warning" />
        {isAdmin && (
          <KpiCard
            label="Faturamento recorrente"
            value={isLoading || !stats ? "..." : fmt(stats.recurringRevenue)}
            hint={isLoading || !stats ? undefined : `Valor total: ${fmt(stats.totalRevenue)} • Receita do mês: ${fmt(stats.monthlyIncome)}`}
            icon={<TrendingUp className="h-5 w-5" />}
            accent="success"
          />
        )}
      </div>

      {/* Impacto */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Impacto social</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Jovens remunerados" value={isLoading || !stats ? "..." : stats.remunerated} icon={<Users className="h-5 w-5" />} accent="success" />
          <KpiCard label="Com CNPJ" value={isLoading || !stats ? "..." : stats.youngsWithCnpj} icon={<Building2 className="h-5 w-5" />} accent="info" />
          <KpiCard label="Renda média / jovem" value={isLoading || !stats ? "..." : fmtFull(stats.avgIncome)} icon={<TrendingUp className="h-5 w-5" />} accent="primary" />
          <KpiCard label="Tarefas atrasadas" value={isLoading || !stats ? "..." : stats.overdueTasks} icon={<AlertCircle className="h-5 w-5" />} accent="warning" />
        </div>
      </div>

      {/* Comercial */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Comercial</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Oportunidades abertas" value={isLoading || !stats ? "..." : stats.openOpportunities} icon={<Target className="h-5 w-5" />} accent="primary" />
          <KpiCard label="Valor em pipeline" value={isLoading || !stats ? "..." : fmt(stats.pipelineValue)} icon={<TrendingUp className="h-5 w-5" />} accent="info" />
          <KpiCard label="Follow-ups atrasados" value={isLoading || !stats ? "..." : stats.overdueFollowups} icon={<AlertCircle className="h-5 w-5" />} accent="warning" />
          <KpiCard label="Próximas reuniões" value={isLoading || !stats ? "..." : stats.upcomingMeetings.length} icon={<Calendar className="h-5 w-5" />} accent="primary" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="pulse-card border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Inscrições por status</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !stats || stats.appStatusData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados ainda</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.appStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.appStatusData.map((entry, index) => {
                      const COLORS = ["url(#grad-brand)", "url(#grad-cool)", "url(#grad-warm)", "url(#grad-mid)"];
                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#11111A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "white" }} itemStyle={{ color: "white" }} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="pulse-card border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Jovens por fase da trilha</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !stats || stats.trailData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados ainda</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.trailData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" fill="transparent" verticalFill={["transparent", "transparent"]} horizontalFill={["transparent", "transparent"]} />
                    <XAxis dataKey="fase" stroke="#A1A1AA" fontSize={11} />
                    <YAxis stroke="#A1A1AA" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#11111A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "white" }} itemStyle={{ color: "white" }} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                    <Bar dataKey="total" fill="url(#grad-warm)" radius={[6, 6, 0, 0]} maxBarSize={60} />
                  </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="pulse-card border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Evolução de clientes (6 meses)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.clientsByMonth || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" fill="transparent" verticalFill={["transparent", "transparent"]} horizontalFill={["transparent", "transparent"]} />
                  <XAxis dataKey="mes" stroke="#A1A1AA" fontSize={11} />
                  <YAxis stroke="#A1A1AA" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#11111A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "white" }} itemStyle={{ color: "white" }} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                  <Line type="monotone" dataKey="clientes" stroke="#EC4899" strokeWidth={2.5} dot={{ fill: "#EC4899", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Listas */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="pulse-card border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> Atividade recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !stats || stats.activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
            ) : (
              stats.activityLogs.map((a) => (
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

        <Card className="pulse-card border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" /> Próximas reuniões
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !stats || stats.upcomingMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma reunião agendada.</p>
            ) : (
              stats.upcomingMeetings.map((m) => (
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

        <Card className="pulse-card border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" /> Tarefas com prazo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !stats || stats.upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa com prazo.</p>
            ) : (
              stats.upcomingTasks.map((t) => {
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

function ClienteDashboardContent() {
  return (
    <div className="flex h-64 flex-col items-center justify-center space-y-4 rounded-xl border border-border/60 bg-card/70 p-6 text-center">
      <Building2 className="h-12 w-12 text-primary opacity-50" />
      <div className="space-y-1">
        <h3 className="text-xl font-bold">Bem-vindo à MTX Hub</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          O seu painel de parceiro corporativo está em desenvolvimento. Em breve você terá acesso a relatórios e acompanhamento da sua equipe.
        </p>
      </div>
    </div>
  );
}
