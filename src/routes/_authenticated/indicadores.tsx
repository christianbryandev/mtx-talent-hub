import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import { Download, BarChart3 } from "lucide-react";
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
import { format, parseISO, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/indicadores")({
  head: () => ({ meta: [{ title: "Indicadores — MTX Hub" }] }),
  component: IndicadoresPage,
});

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "#a78bfa",
  "#f472b6",
];

type RangeOption = "3m" | "6m" | "12m";

function rangeMonths(range: RangeOption): number {
  return range === "3m" ? 3 : range === "6m" ? 6 : 12;
}

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

function IndicadoresPage() {
  const [range, setRange] = useState<RangeOption>("6m");
  const months = rangeMonths(range);
  const since = startOfMonth(subMonths(new Date(), months - 1)).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["indicadores", range],
    queryFn: async () => {
      const [clients, opps, tasks, youngs, meetings, services] = await Promise.all([
        supabase.from("clients").select("id, status, monthly_value, created_at, niche"),
        supabase.from("opportunities").select("id, status, funnel_stage, estimated_value, created_at, loss_reason"),
        supabase.from("tasks").select("id, status, priority, kanban_column, created_at, completed_at, due_date"),
        supabase.from("young_people").select("id, status, trail_phase, has_cnpj, total_income_generated, created_at"),
        supabase.from("meetings").select("id, type, status, date"),
        supabase.from("client_services").select("id, service_name, monthly_value, status"),
      ]);
      return {
        clients: clients.data ?? [],
        opps: opps.data ?? [],
        tasks: tasks.data ?? [],
        youngs: youngs.data ?? [],
        meetings: meetings.data ?? [],
        services: services.data ?? [],
      };
    },
  });

  const charts = useMemo(() => {
    if (!data) return null;
    const buckets: Record<string, { month: string; clients: number; opps: number; tasks: number }> = {};
    for (let i = months - 1; i >= 0; i--) {
      const d = startOfMonth(subMonths(new Date(), i));
      const key = format(d, "yyyy-MM");
      buckets[key] = { month: format(d, "MMM", { locale: ptBR }), clients: 0, opps: 0, tasks: 0 };
    }
    data.clients.forEach((c: any) => {
      const k = c.created_at?.slice(0, 7);
      if (buckets[k]) buckets[k].clients++;
    });
    data.opps.forEach((o: any) => {
      const k = o.created_at?.slice(0, 7);
      if (buckets[k]) buckets[k].opps++;
    });
    data.tasks.forEach((t: any) => {
      const k = t.created_at?.slice(0, 7);
      if (buckets[k]) buckets[k].tasks++;
    });
    const evolution = Object.values(buckets);

    const funnelOrder = ["prospeccao", "qualificacao", "proposta", "negociacao", "ganha", "perdida"];
    const funnel = funnelOrder.map((stage) => ({
      stage,
      total: data.opps.filter((o: any) => o.funnel_stage === stage).length,
      valor: data.opps
        .filter((o: any) => o.funnel_stage === stage)
        .reduce((acc: number, o: any) => acc + Number(o.estimated_value ?? 0), 0),
    }));

    const trailOrder = ["formacao", "estagio", "atendimento", "ativo", "graduado"];
    const trails = trailOrder.map((phase) => ({
      phase,
      total: data.youngs.filter((y: any) => y.trail_phase === phase).length,
    }));

    const tasksByStatus = ["backlog", "fazendo", "revisao", "concluida"].map((col) => ({
      name: col,
      total: data.tasks.filter((t: any) => t.kanban_column === col).length,
    }));

    const meetingsByType = ["geral_jovens", "mentoria", "operacional", "comercial", "alinhamento_entrega"].map(
      (type) => ({
        type,
        total: data.meetings.filter((m: any) => m.type === type).length,
      }),
    );

    const totalMRR = data.clients
      .filter((c: any) => c.status === "ativo")
      .reduce((acc: number, c: any) => acc + Number(c.monthly_value ?? 0), 0);

    const lossReasons: Record<string, number> = {};
    data.opps
      .filter((o: any) => o.status === "perdida" && o.loss_reason)
      .forEach((o: any) => {
        lossReasons[o.loss_reason] = (lossReasons[o.loss_reason] ?? 0) + 1;
      });
    const lossData = Object.entries(lossReasons).map(([name, value]) => ({ name, value }));

    return { evolution, funnel, trails, tasksByStatus, meetingsByType, totalMRR, lossData };
  }, [data, months]);

  if (isLoading || !charts) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Indicadores
          </h1>
          <p className="text-sm text-muted-foreground">Métricas e relatórios estratégicos do MTX Hub.</p>
        </div>
        <div className="flex items-center gap-2">
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

      <Tabs defaultValue="comercial">
        <TabsList>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="operacional">Operacional</TabsTrigger>
          <TabsTrigger value="social">Impacto Social</TabsTrigger>
          <TabsTrigger value="reunioes">Reuniões</TabsTrigger>
        </TabsList>

        <TabsContent value="comercial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">MRR Ativo</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {charts.totalMRR.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Oportunidades abertas</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data!.opps.filter((o: any) => o.status === "aberta").length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Clientes ativos</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data!.clients.filter((c: any) => c.status === "ativo").length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Funil de Vendas</CardTitle>
              <Button variant="outline" size="sm" onClick={() => downloadCSV("funil.csv", charts.funnel)}>
                <Download className="h-4 w-4 mr-2" />CSV
              </Button>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.funnel}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name="Qtd" />
                  <Bar dataKey="valor" fill="hsl(var(--info))" name="Valor R$" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Evolução mensal</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.evolution}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="clients" stroke="hsl(var(--primary))" name="Clientes" />
                    <Line type="monotone" dataKey="opps" stroke="hsl(var(--info))" name="Oportunidades" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Motivos de perda</CardTitle>
                <Button variant="outline" size="sm" onClick={() => downloadCSV("perdas.csv", charts.lossData)}>
                  <Download className="h-4 w-4 mr-2" />CSV
                </Button>
              </CardHeader>
              <CardContent className="h-72">
                {charts.lossData.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">Sem perdas registradas</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={charts.lossData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                        {charts.lossData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operacional" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tarefas por coluna do Kanban</CardTitle>
              <Button variant="outline" size="sm" onClick={() => downloadCSV("tarefas.csv", charts.tasksByStatus)}>
                <Download className="h-4 w-4 mr-2" />CSV
              </Button>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.tasksByStatus}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Jovens por fase da trilha</CardTitle>
              <Button variant="outline" size="sm" onClick={() => downloadCSV("trilha.csv", charts.trails)}>
                <Download className="h-4 w-4 mr-2" />CSV
              </Button>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.trails}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="phase" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--success))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Jovens com CNPJ</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data!.youngs.filter((y: any) => y.has_cnpj).length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Jovens</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data!.youngs.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Renda gerada (total)</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data!.youngs
                    .reduce((a: number, y: any) => a + Number(y.total_income_generated ?? 0), 0)
                    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reunioes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reuniões por tipo</CardTitle>
              <Button variant="outline" size="sm" onClick={() => downloadCSV("reunioes.csv", charts.meetingsByType)}>
                <Download className="h-4 w-4 mr-2" />CSV
              </Button>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.meetingsByType}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--info))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
