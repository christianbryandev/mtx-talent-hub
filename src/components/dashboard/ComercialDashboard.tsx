import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Target,
  TrendingUp,
  AlertCircle,
  Trophy,
  CalendarClock,
} from "lucide-react";
import { format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { FUNNEL_STAGE_LABELS, type FunnelStage } from "@/types/crm";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function ComercialDashboard() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ["comercial-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [oppRes, interactionsRes, clientsRes] = await Promise.all([
        supabase
          .from("opportunities")
          .select("id, company_name, status, estimated_value, funnel_stage, next_followup_date, updated_at, commercial_responsible"),
        supabase
          .from("opportunity_interactions")
          .select("id, type, description, created_at, opportunity_id")
          .eq("recorded_by", user!.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("clients")
          .select("id, company_name, created_at, status, monthly_value")
          .gte("created_at", monthStart),
      ]);

      const opps = oppRes.data ?? [];
      const mine = opps.filter((o) => o.commercial_responsible === user!.id);

      const openMine = mine.filter((o) => o.status === "aberta");
      const wonThisMonth = mine.filter(
        (o) => o.status === "ganha" && o.updated_at >= monthStart,
      );
      const overdueMine = openMine.filter(
        (o) => o.next_followup_date && o.next_followup_date < today,
      );

      const pipelineValue = openMine.reduce(
        (s, o) => s + (Number(o.estimated_value) || 0),
        0,
      );

      const byStage: Record<string, number> = {};
      openMine.forEach((o) => {
        byStage[o.funnel_stage] = (byStage[o.funnel_stage] ?? 0) + 1;
      });

      return {
        openCount: openMine.length,
        wonCount: wonThisMonth.length,
        overdueCount: overdueMine.length,
        pipelineValue,
        overdueList: overdueMine.slice(0, 5),
        byStage,
        recentInteractions: interactionsRes.data ?? [],
        recentClients: (clientsRes.data ?? []).slice(0, 5),
      };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel Comercial</h1>
        <p className="text-sm text-muted-foreground">
          Suas oportunidades, follow-ups e fechamentos.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<Target className="h-5 w-5" />}
          label="Oportunidades abertas"
          value={data.openCount.toString()}
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Pipeline (valor)"
          value={brl(data.pipelineValue)}
        />
        <KpiCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Follow-ups atrasados"
          value={data.overdueCount.toString()}
          accent={data.overdueCount > 0 ? "warning" : "primary"}
        />
        <KpiCard
          icon={<Trophy className="h-5 w-5" />}
          label="Ganhas este mês"
          value={data.wonCount.toString()}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição no funil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.keys(data.byStage).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma oportunidade aberta.</p>
            ) : (
              Object.entries(data.byStage)
                .sort((a, b) => b[1] - a[1])
                .map(([stage, count]) => (
                  <div key={stage} className="flex items-center justify-between text-sm">
                    <span>{FUNNEL_STAGE_LABELS[stage as FunnelStage] ?? stage}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-500" />
              Follow-ups atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.overdueList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tudo em dia 🎉</p>
            ) : (
              <ul className="space-y-2">
                {data.overdueList.map((o) => (
                  <li key={o.id}>
                    <Link
                      to="/crm/$id"
                      params={{ id: o.id }}
                      className="flex items-center justify-between text-sm hover:bg-muted/50 rounded p-2 -mx-2"
                    >
                      <span className="truncate">{o.company_name}</span>
                      <span className="text-xs text-destructive shrink-0">
                        {o.next_followup_date
                          ? format(parseISO(o.next_followup_date), "dd/MM", { locale: ptBR })
                          : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Minhas últimas interações</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentInteractions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma interação registrada.</p>
            ) : (
              <ul className="space-y-2">
                {data.recentInteractions.map((i) => (
                  <li key={i.id} className="text-sm border-l-2 border-primary pl-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{i.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(i.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="truncate">{i.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clientes do mês</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem novos clientes ainda este mês.</p>
            ) : (
              <ul className="space-y-2">
                {data.recentClients.map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/clientes/$id"
                      params={{ id: c.id }}
                      className="flex items-center justify-between text-sm hover:bg-muted/50 rounded p-2 -mx-2"
                    >
                      <span className="truncate">{c.company_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {brl(Number(c.monthly_value) || 0)}/mês
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
