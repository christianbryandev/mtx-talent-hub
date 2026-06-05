import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import {
  Download,
  BarChart3,
  TrendingUp,
  Users,
  Target,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useIndicadores } from "@/hooks/useIndicadores";
import type { AreaFilter, RangeOption } from "@/services/analyticsService";

export const Route = createFileRoute("/_authenticated/indicadores")({
  head: () => ({ meta: [{ title: "Indicadores — MTX Hub" }] }),
  component: IndicadoresPage,
});

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "#a78bfa",
  "#f472b6",
];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    toast.error("Nenhum dado para exportar");
    return;
  }
  const csv = Papa.unparse(rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  toast.success("CSV exportado");
}

interface KpiHeroProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "warning" | "info";
}
function KpiHero({ label, value, hint, icon, tone = "default" }: KpiHeroProps) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
  }[tone];
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={`mt-1 text-2xl font-bold truncate ${toneClass}`}>{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className="rounded-md bg-muted p-2 text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AlertCardProps {
  title: string;
  count: number;
  to?: string;
  icon: React.ReactNode;
}
function AlertCard({ title, count, to, icon }: AlertCardProps) {
  const tone = count === 0 ? "border-border" : "border-warning/40 bg-warning/5";
  const body = (
    <Card className={`h-full transition-colors hover:bg-muted/40 ${tone}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="rounded-md bg-muted p-2 text-warning shrink-0">{icon}</div>
          {count > 0 && (
            <Badge variant="outline" className="text-warning border-warning/40 shrink-0">
              Ação
            </Badge>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground leading-tight">{title}</p>
        <p className="mt-1 text-2xl font-semibold">{count}</p>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to as any} className="block h-full">{body}</Link> : body;
}

function IndicadoresPage() {
  const [range, setRange] = useState<RangeOption>("6m");
  const [area, setArea] = useState<AreaFilter>("geral");
  const [responsavelId, setResponsavelId] = useState<string | null>(null);

  const { data: responsaveis } = useQuery({
    queryKey: ["indicadores", "responsaveis"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name");
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const filters = useMemo(() => ({ range, area, responsavelId }), [range, area, responsavelId]);
  const { analytics, isLoading } = useIndicadores(filters);

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const { kpisTop, funnel, bottleneck, alerts, operacao, social, evolution, lossData, reunioes } = analytics;

  return (
    <div className="space-y-6">
      {/* Header + filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" / maxBarSize={60} />
            Indicadores
          </h1>
          <p className="text-sm text-muted-foreground">Painel executivo do MTX Hub — visão de 5 minutos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={area} onValueChange={(v) => setArea(v as AreaFilter)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="geral">Geral</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="operacional">Operacional</SelectItem>
              <SelectItem value="social">Impacto Social</SelectItem>
              <SelectItem value="reunioes">Reuniões</SelectItem>
            </SelectContent>
          </Select>
          <Select value={responsavelId ?? "all"} onValueChange={(v) => setResponsavelId(v === "all" ? null : v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos responsáveis</SelectItem>
              {(responsaveis ?? []).map((r: any) => (
                <SelectItem key={r.id} value={r.id}>{r.full_name ?? "—"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={(v) => setRange(v as RangeOption)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Últimos 3 meses</SelectItem>
              <SelectItem value="6m">Últimos 6 meses</SelectItem>
              <SelectItem value="12m">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 1) TOPO — VISÃO EXECUTIVA */}
      {(area === "geral" || area === "comercial") && (
        <section className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <KpiHero label="MRR Ativo" value={fmtBRL(kpisTop.mrr)} icon={<Wallet className="h-4 w-4" />} tone="success" />
          <KpiHero label="Novos clientes (mês)" value={String(kpisTop.newClientsMonth)} icon={<Users className="h-4 w-4" />} />
          <KpiHero label="Taxa de conversão" value={fmtPct(kpisTop.conversionRate)} hint="Ganhas / fechadas" icon={<Target className="h-4 w-4" />} tone="info" />
          <KpiHero label="Ticket médio" value={fmtBRL(kpisTop.ticketMedio)} icon={<DollarSign className="h-4 w-4" />} />
          <KpiHero label="Receita prevista" value={fmtBRL(kpisTop.receitaPrevista)} hint="Propostas abertas" icon={<TrendingUp className="h-4 w-4" />} tone="info" />
        </section>
      )}

      {/* 3) ALERTAS OPERACIONAIS */}
      {(area === "geral" || area === "operacional") && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Alertas — o que precisa de ação
          </h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <AlertCard title="Tarefas atrasadas" count={alerts.tasksLate} icon={<Clock className="h-4 w-4" />} to="/tarefas" />
            <AlertCard title="Follow-ups vencidos" count={alerts.followupsLate} icon={<Target className="h-4 w-4" />} to="/crm" />
            <AlertCard title="Jovens inativos (30d)" count={alerts.inactiveYoungs} icon={<Users className="h-4 w-4" />} to="/jovens" />
            <AlertCard title="Clientes em pendência" count={alerts.clientsPending} icon={<AlertTriangle className="h-4 w-4" />} to="/clientes" />
          </div>
        </section>
      )}

      <Tabs defaultValue={area === "geral" ? "comercial" : area === "social" ? "social" : area}>
        <TabsList>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="operacional">Operacional</TabsTrigger>
          <TabsTrigger value="social">Impacto Social</TabsTrigger>
          <TabsTrigger value="reunioes">Reuniões</TabsTrigger>
        </TabsList>

        {/* COMERCIAL — Funil + Evolução + Perdas */}
        <TabsContent value="comercial" className="space-y-4">
          {/* 2) FUNIL */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Funil de Vendas</CardTitle>
                {bottleneck && (
                  <p className="mt-1 text-xs text-warning">Gargalo identificado: {bottleneck}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadCSV("funil.csv", funnel)}>
                <Download className="h-4 w-4 mr-2" />CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-6">
                {funnel.map((f) => (
                  <div key={f.stage} className="rounded-lg border border-border bg-card/60 p-3">
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="text-lg font-semibold">{f.qtd}</p>
                    <p className="text-xs text-muted-foreground">{fmtBRL(f.valor)}</p>
                    {f.conversao !== null && (
                      <p className={`mt-1 text-xs ${f.conversao < 50 ? "text-warning" : "text-success"}`}>
                        ↳ {fmtPct(f.conversao)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel} maxBarSize={60} />
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} / fill="transparent" verticalFill={["transparent", "transparent"]} horizontalFill={["transparent", "transparent"]} />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="qtd" fill="hsl(var(--primary))" name="Qtd" / maxBarSize={60} />
                    <Bar dataKey="valor" fill="hsl(var(--info))" name="Valor R$" / maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 6) EVOLUÇÃO */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Evolução mensal</CardTitle>
              <Button variant="outline" size="sm" onClick={() => downloadCSV("evolucao.csv", evolution)}>
                <Download className="h-4 w-4 mr-2" />CSV
              </Button>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} / fill="transparent" verticalFill={["transparent", "transparent"]} horizontalFill={["transparent", "transparent"]} />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="clientes" stroke="hsl(var(--primary))" name="Clientes" />
                  <Line yAxisId="left" type="monotone" dataKey="oportunidades" stroke="hsl(var(--info))" name="Oportunidades" />
                  <Line yAxisId="right" type="monotone" dataKey="receita" stroke="hsl(var(--success))" name="Receita (R$)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 7) MOTIVOS DE PERDA */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Motivos de perda</CardTitle>
              <Button variant="outline" size="sm" onClick={() => downloadCSV("perdas.csv", lossData)}>
                <Download className="h-4 w-4 mr-2" />CSV
              </Button>
            </CardHeader>
            <CardContent className="h-72">
              {lossData.length === 0 ? (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  Sem perdas registradas no período.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={lossData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {lossData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4) OPERACIONAL */}
        <TabsContent value="operacional" className="space-y-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            <KpiHero label="Concluídas (7d)" value={String(operacao.tasksDoneWeek)} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
            <KpiHero label="Atrasadas" value={String(operacao.tasksLate)} icon={<Clock className="h-4 w-4" />} tone="warning" />
            <KpiHero label="No prazo" value={fmtPct(operacao.onTimeRate)} icon={<Target className="h-4 w-4" />} tone="info" />
            <KpiHero label="Projetos ativos" value={String(operacao.projetosAndamento)} icon={<BarChart3 className="h-4 w-4" / maxBarSize={60} />} />
            <KpiHero label="Projetos em risco" value={String(operacao.projetosRisco)} icon={<AlertTriangle className="h-4 w-4" />} tone="warning" />
          </div>
        </TabsContent>

        {/* 5) IMPACTO SOCIAL */}
        <TabsContent value="social" className="space-y-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <KpiHero label="Jovens ativos" value={String(social.ativos)} icon={<Users className="h-4 w-4" />} tone="success" />
            <KpiHero label="Em formação" value={String(social.formacao)} icon={<Users className="h-4 w-4" />} />
            <KpiHero label="Em prática" value={String(social.pratica)} icon={<Users className="h-4 w-4" />} />
            <KpiHero label="Gerando renda" value={String(social.gerandoRenda)} icon={<DollarSign className="h-4 w-4" />} tone="success" />
            <KpiHero label="1º cliente" value={String(social.primeiroCliente)} icon={<Target className="h-4 w-4" />} />
            <KpiHero label="Renda total" value={fmtBRL(social.rendaTotal)} icon={<Wallet className="h-4 w-4" />} tone="success" />
            <KpiHero label="Renda média/jovem" value={fmtBRL(social.rendaMedia)} hint="entre jovens com renda" icon={<DollarSign className="h-4 w-4" />} />
          </div>
        </TabsContent>

        {/* 8) REUNIÕES */}
        <TabsContent value="reunioes" className="space-y-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <KpiHero label="Realizadas" value={String(reunioes.realizadas)} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
            <KpiHero label="Presença média" value={fmtPct(reunioes.presencaMedia)} icon={<Users className="h-4 w-4" />} tone="info" />
            <KpiHero label="Tarefas geradas" value={String(reunioes.tarefasGeradas)} icon={<Target className="h-4 w-4" />} />
            <KpiHero label="Tarefas concluídas" value={String(reunioes.tarefasConcluidas)} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
