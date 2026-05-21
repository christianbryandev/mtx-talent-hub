import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Users,
  CheckCircle2,
  AlertTriangle,
  Activity,
  XCircle,
  Search,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JourneyMonitorDetail } from "./JourneyMonitorDetail";

export type MonitorStatus =
  | "Não iniciada"
  | "Em andamento"
  | "Concluído"
  | "Travado"
  | "Reprovado";

export interface MonitorRow {
  user_id: string;
  name: string;
  email: string;
  total_xp: number;
  current_phase: string;
  progress_percentage: number;
  quizzes_taken: number;
  quizzes_passed: number;
  total_attempts: number;
  last_score: number | null;
  best_score: number | null;
  last_attempt_passed: boolean | null;
  last_activity: string | null;
  started_at: string | null;
  status: MonitorStatus;
}

async function fetchMonitor(): Promise<MonitorRow[]> {
  const { data, error } = await supabase.rpc("admin_get_journey_monitor" as never);
  if (error) throw new Error(error.message);
  return (data ?? []) as MonitorRow[];
}

const STATUS_VARIANT: Record<MonitorStatus, "default" | "secondary" | "destructive" | "outline"> = {
  Concluído: "default",
  "Em andamento": "secondary",
  Travado: "destructive",
  Reprovado: "destructive",
  "Não iniciada": "outline",
};

function isStale(iso: string | null): boolean {
  if (!iso) return true;
  const diff = Date.now() - new Date(iso).getTime();
  return diff > 14 * 24 * 60 * 60 * 1000;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function JourneyMonitor() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-journey-monitor"],
    queryFn: fetchMonitor,
    staleTime: 30_000,
  });

  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [quizFilter, setQuizFilter] = useState<string>("all");
  const [selected, setSelected] = useState<MonitorRow | null>(null);

  const phases = useMemo(
    () => Array.from(new Set((data ?? []).map((r) => r.current_phase))).sort(),
    [data],
  );

  const summary = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      em_andamento: rows.filter((r) => r.status === "Em andamento").length,
      concluido: rows.filter((r) => r.status === "Concluído").length,
      travado: rows.filter((r) => r.status === "Travado").length,
      reprovado: rows.filter((r) => r.last_attempt_passed === false).length,
      inativos: rows.filter((r) => isStale(r.last_activity)).length,
    };
  }, [data]);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q))
        return false;
      if (phaseFilter !== "all" && r.current_phase !== phaseFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (quizFilter === "approved" && r.last_attempt_passed !== true) return false;
      if (quizFilter === "failed" && r.last_attempt_passed !== false) return false;
      if (quizFilter === "none" && r.total_attempts > 0) return false;
      return true;
    });
  }, [data, search, phaseFilter, statusFilter, quizFilter]);

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : "Falha ao carregar monitor."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo operacional */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard icon={Users} label="Total" value={summary.total} loading={isLoading} />
        <SummaryCard icon={Activity} label="Em andamento" value={summary.em_andamento} loading={isLoading} />
        <SummaryCard icon={CheckCircle2} label="Concluídos" value={summary.concluido} loading={isLoading} />
        <SummaryCard icon={AlertTriangle} label="Travados" value={summary.travado} loading={isLoading} tone="warn" />
        <SummaryCard icon={XCircle} label="Reprovados" value={summary.reprovado} loading={isLoading} tone="danger" />
        <SummaryCard icon={AlertTriangle} label="Sem atividade 14d+" value={summary.inativos} loading={isLoading} tone="warn" />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              aria-label="Buscar jovem"
            />
          </div>
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger aria-label="Filtrar por fase"><SelectValue placeholder="Fase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fases</SelectItem>
              {phases.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filtrar por status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="Não iniciada">Não iniciada</SelectItem>
              <SelectItem value="Em andamento">Em andamento</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
              <SelectItem value="Travado">Travado</SelectItem>
              <SelectItem value="Reprovado">Reprovado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={quizFilter} onValueChange={setQuizFilter}>
            <SelectTrigger aria-label="Filtrar por quiz"><SelectValue placeholder="Quiz" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer quiz</SelectItem>
              <SelectItem value="approved">Última tentativa: aprovado</SelectItem>
              <SelectItem value="failed">Última tentativa: reprovado</SelectItem>
              <SelectItem value="none">Sem tentativas</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabela */}
      {isLoading ? (
        <Card className="p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {data && data.length > 0
              ? "Nenhum jovem corresponde aos filtros."
              : "Nenhum jovem iniciou a jornada ainda."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jovem</TableHead>
                  <TableHead>Fase atual</TableHead>
                  <TableHead className="w-[180px]">Progresso</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                  <TableHead className="text-right">Quizzes</TableHead>
                  <TableHead className="text-right">Última nota</TableHead>
                  <TableHead className="text-right">Melhor</TableHead>
                  <TableHead className="text-right">Tent.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Última atividade</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.user_id}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">{row.current_phase}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={row.progress_percentage} className="h-1.5" />
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {row.progress_percentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {row.total_xp}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.quizzes_taken}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.last_score != null ? `${Math.round(row.last_score)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.best_score != null ? `${Math.round(row.best_score)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.total_attempts}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {fmtDate(row.last_activity)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelected(row)}
                        aria-label={`Ver detalhes de ${row.name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <JourneyMonitorDetail
        row={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  loading?: boolean;
  tone?: "warn" | "danger";
}) {
  const toneCls =
    tone === "danger"
      ? "text-destructive"
      : tone === "warn"
        ? "text-amber-500"
        : "text-primary";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${toneCls}`} />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-12" />
        ) : (
          <div className="text-2xl font-bold tabular-nums">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}
