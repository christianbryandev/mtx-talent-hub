import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Users, Activity, Trophy, Sparkles, TrendingDown, CheckCircle2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useJourneyAnalytics } from "@/hooks/useJourneyAnalytics";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/admin/jornada-dashboard")({
  head: () => ({ meta: [{ title: "Admin · Jornada — MTX Hub" }] }),
  component: AdminJourneyDashboard,
});

function AdminJourneyDashboard() {
  const { isAdmin, loading: permLoading } = usePermissions();
  const { kpis, distribution, conversion } = useJourneyAnalytics();

  if (permLoading) return <Skeleton className="h-64 w-full" />;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics da Jornada</h1>
        <p className="text-sm text-muted-foreground">
          Métricas agregadas vindas do backend (SSOT).
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.isLoading || !kpis.data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <KpiCard
              label="Total de usuários"
              value={kpis.data.total_users}
              icon={<Users className="h-5 w-5" />}
              accent="primary"
            />
            <KpiCard
              label="Em andamento"
              value={kpis.data.active_users}
              icon={<Activity className="h-5 w-5" />}
              accent="info"
            />
            <KpiCard
              label="Concluíram a jornada"
              value={kpis.data.completed_users}
              icon={<Trophy className="h-5 w-5" />}
              accent="success"
            />
            <KpiCard
              label="XP médio"
              value={kpis.data.avg_xp}
              icon={<Sparkles className="h-5 w-5" />}
              accent="warning"
            />
          </>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por fase</CardTitle>
        </CardHeader>
        <CardContent>
          {distribution.isLoading || !distribution.data ? (
            <Skeleton className="h-40 w-full" />
          ) : distribution.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados disponíveis.</p>
          ) : (
            <div className="space-y-4">
              {distribution.data.map((p) => {
                const total = p.nao_iniciada + p.em_andamento + p.concluida + p.bloqueada;
                const completionPct = total > 0 ? Math.round((p.concluida / total) * 100) : 0;
                return (
                  <div key={p.phase_id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {p.order_index}. {p.phase_name}
                      </span>
                      <span className="text-muted-foreground">{completionPct}% concluído</span>
                    </div>
                    <Progress value={completionPct} className="h-2" />
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Bloqueada: <strong className="text-foreground">{p.bloqueada}</strong></span>
                      <span>Não iniciada: <strong className="text-foreground">{p.nao_iniciada}</strong></span>
                      <span>Em andamento: <strong className="text-foreground">{p.em_andamento}</strong></span>
                      <span>Concluída: <strong className="text-foreground">{p.concluida}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conversion.isLoading || !conversion.data ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Stat label="Iniciaram" value={conversion.data.total_started} />
                <Stat label="Concluíram" value={conversion.data.total_completed} />
                <Stat label="Dropoff" value={`${conversion.data.dropoff_rate}%`} />
                <Stat label="Aprovação em quiz" value={`${conversion.data.quiz_pass_rate}%`} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Tentativas de quiz
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conversion.isLoading || !conversion.data ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Stat label="Total" value={conversion.data.quiz_attempts_total} />
                <Stat label="Aprovadas" value={conversion.data.quiz_attempts_passed} />
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
