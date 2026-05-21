import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users, Activity, Trophy, Sparkles, Database, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useJourneyKPIs,
  usePhaseFunnel,
  useJourneyConversion,
} from "@/hooks/useJourneyAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { seedJourneyDemo } from "@/utils/journeySeed";
import { JourneyTalentTable } from "@/components/admin/JourneyTalentTable";

export const Route = createFileRoute("/_authenticated/admin/journey-analytics")({
  head: () => ({ meta: [{ title: "Admin · Analytics Jornada — MTX Hub" }] }),
  component: JourneyAnalyticsPage,
});

function JourneyAnalyticsPage() {
  const { isAdmin, loading: permLoading } = usePermissions();
  const qc = useQueryClient();
  const [seeding, setSeeding] = useState(false);

  if (permLoading) return <Skeleton className="h-64 w-full" />;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await seedJourneyDemo();
      if (res.seeded) {
        toast.success(`Jornada populada com ${res.phases ?? 3} fases de exemplo.`);
        await qc.invalidateQueries();
      } else {
        toast.info("O catálogo da Jornada já contém fases. Nada a fazer.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao popular dados.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics da Jornada</h1>
          <p className="text-sm text-muted-foreground">
            Métricas agregadas calculadas no backend.
          </p>
        </div>
        <Button onClick={handleSeed} disabled={seeding} variant="outline">
          {seeding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Database className="mr-2 h-4 w-4" />
          )}
          Popular Dados de Exemplo (Seed)
        </Button>
      </header>

      <KpiRow />

      <section className="grid gap-4 lg:grid-cols-2">
        <PhaseDistributionCard />
        <ConversionCard />
      </section>

      <ConversionMiniCards />

      <section className="space-y-3">
        <h3 className="text-lg font-semibold tracking-tight">Tracking Individual</h3>
        <JourneyTalentTable />
      </section>
    </div>
  );
}

/* ---------------- KPI row ---------------- */

function KpiRow() {
  const { data, loading, error } = useJourneyKPIs();

  if (loading) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </section>
    );
  }

  if (error || !data) return <EmptyState message="Sem dados de KPIs disponíveis." />;

  const items = [
    { label: "Usuários na Jornada", value: data.total_users, icon: Users },
    { label: "Em andamento", value: data.active_users, icon: Activity },
    { label: "Concluídos", value: data.completed_users, icon: Trophy },
    { label: "XP médio", value: data.avg_xp, icon: Sparkles },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

/* ---------------- Phase distribution ---------------- */

function PhaseDistributionCard() {
  const { data, loading, error } = usePhaseFunnel();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por Fase</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : error || !data || data.length === 0 ? (
          <EmptyState message="Sem dados de distribuição." />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.map((d) => ({
                  phase_name: d.phase_name,
                  total_users: d.total_users,
                }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="phase_name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="total_users"
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Conversion ---------------- */

function ConversionCard() {
  const { data, loading, error } = useJourneyConversion();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Conversão da Jornada</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : error || !data ? (
          <EmptyState message="Sem dados de conversão." />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={[
                  { label: "Iniciaram", value: data.total_started },
                  { label: "Concluíram", value: data.total_completed },
                ]}
                margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="hsl(var(--primary))"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Conversion mini cards ---------------- */

function ConversionMiniCards() {
  const { data, loading, error } = useJourneyConversion();

  if (loading) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </section>
    );
  }

  if (error || !data) return <EmptyState message="Sem dados de conversão detalhada." />;

  const fmtPct = (v: number) =>
    `${Math.round((v ?? 0) <= 1 ? (v ?? 0) * 100 : (v ?? 0))}%`;

  const items = [
    { label: "Taxa de Abandono", value: fmtPct(data.dropoff_rate) },
    { label: "Aprovação no Quiz", value: fmtPct(data.quiz_pass_rate) },
    { label: "Total de Tentativas", value: String(data.quiz_attempts_total ?? 0) },
    { label: "Tentativas Aprovadas", value: String(data.quiz_attempts_passed ?? 0) },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ label, value }) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

/* ---------------- Shared ---------------- */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
