import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  Building2,
  ListChecks,
  TrendingUp,
  Activity,
  Calendar,
  Clock,
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

import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MTX Hub" }] }),
  component: DashboardPage,
});

const trilhaData = [
  { fase: "Acolhimento", total: 18 },
  { fase: "Formação", total: 32 },
  { fase: "Prática", total: 24 },
  { fase: "Mercado", total: 14 },
  { fase: "Alumni", total: 9 },
];

const clientesData = [
  { mes: "Jan", clientes: 4 },
  { mes: "Fev", clientes: 6 },
  { mes: "Mar", clientes: 8 },
  { mes: "Abr", clientes: 11 },
  { mes: "Mai", clientes: 14 },
  { mes: "Jun", clientes: 18 },
];

const recentActivity = [
  { user: "Mariana S.", action: "convidou", target: "Carlos Lima", time: "há 12min" },
  { user: "Pedro A.", action: "criou cliente", target: "Lumen Marketing", time: "há 1h" },
  { user: "Sistema", action: "atualizou trilha de", target: "Jovens (T3)", time: "há 3h" },
  { user: "Júlia M.", action: "fechou proposta com", target: "VertexTech", time: "há 5h" },
];

const upcomingMeetings = [
  { title: "Kickoff — VertexTech", when: "Hoje, 14:00", type: "Cliente" },
  { title: "Mentoria semanal — T3", when: "Amanhã, 09:00", type: "Interna" },
  { title: "Review trimestral", when: "Quinta, 16:30", type: "Estratégia" },
];

const upcomingTasks = [
  { title: "Enviar proposta — Atlas Sales", due: "Hoje" },
  { title: "Revisar pitch deck", due: "Amanhã" },
  { title: "Onboarding Carlos Lima", due: "Sex" },
];

function DashboardPage() {
  const { isAdmin } = usePermissions();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Visão geral</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumo executivo da operação MTX
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Jovens ativos"
          value="97"
          icon={<Users className="h-5 w-5" />}
          trend={{ value: "+8 este mês", positive: true }}
          accent="primary"
        />
        <KpiCard
          label="Clientes ativos"
          value="18"
          icon={<Building2 className="h-5 w-5" />}
          trend={{ value: "+4 este mês", positive: true }}
          accent="info"
        />
        <KpiCard
          label="Tarefas em aberto"
          value="42"
          icon={<ListChecks className="h-5 w-5" />}
          accent="warning"
        />
        {isAdmin && (
          <KpiCard
            label="Faturamento do mês"
            value="R$ 184k"
            icon={<TrendingUp className="h-5 w-5" />}
            trend={{ value: "+12,4%", positive: true }}
            accent="success"
          />
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Jovens por fase da trilha</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trilhaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.018 270)" />
                <XAxis dataKey="fase" stroke="oklch(0.72 0.015 270)" fontSize={11} />
                <YAxis stroke="oklch(0.72 0.015 270)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.02 270)",
                    border: "1px solid oklch(0.32 0.018 270)",
                    borderRadius: 8,
                    color: "white",
                  }}
                />
                <Bar dataKey="total" fill="oklch(0.78 0.14 80)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Evolução de clientes (6 meses)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={clientesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.018 270)" />
                <XAxis dataKey="mes" stroke="oklch(0.72 0.015 270)" fontSize={11} />
                <YAxis stroke="oklch(0.72 0.015 270)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.02 270)",
                    border: "1px solid oklch(0.32 0.018 270)",
                    borderRadius: 8,
                    color: "white",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="clientes"
                  stroke="oklch(0.78 0.14 80)"
                  strokeWidth={2.5}
                  dot={{ fill: "oklch(0.78 0.14 80)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
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
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="text-foreground">
                    <span className="font-medium">{a.user}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>{" "}
                    <span className="font-medium">{a.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" /> Próximas reuniões
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMeetings.map((m, i) => (
              <div key={i} className="flex items-start justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.when}</p>
                </div>
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {m.type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" /> Tarefas com prazo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingTasks.map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-foreground">{t.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {t.due}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
