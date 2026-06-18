import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Inbox, Link2, Filter } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InscricaoLinkDialog } from "@/components/jovens/InscricaoLinkDialog";
import { StatusBadge } from "@/components/jovens/StatusBadge";
import { PhaseBadge } from "@/components/jovens/PhaseBadge";
import { YoungFormDialog } from "@/components/jovens/YoungFormDialog";
import { RowActionsMenu } from "@/components/shared/RowActionsMenu";
import { deleteYoungCascade } from "@/lib/cascade-delete";
import { duplicateRow } from "@/lib/duplicate-row";
import { logActivity } from "@/lib/activity-log";
import {
  YOUNG_STATUS_LIST,
  YOUNG_STATUS_LABELS,
  TRAIL_PHASE_LIST,
  TRAIL_PHASE_LABELS,
  INTEREST_AREAS,
  type YoungPerson,
  type YoungStatus,
} from "@/types";

export const Route = createFileRoute("/_authenticated/jovens/")({
  head: () => ({ meta: [{ title: "Jovens — MTX Hub" }] }),
  component: JovensListPage,
});

const PAGE_SIZE = 10;

function JovensListPage() {
  const { isAdmin, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();
  const { user } = useAuth();
  void user;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [toDelete, setToDelete] = useState<YoungPerson | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (y: YoungPerson) => {
      await deleteYoungCascade(y.id);
      await logActivity({
        action: "young_deleted",
        entity_type: "young_people",
        entity_id: y.id,
        description: `Jovem ${y.full_name} excluído`,
      });
    },
    onSuccess: () => {
      toast.success("Jovem excluído");
      qc.invalidateQueries({ queryKey: ["young_people"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: jovens = [], isLoading } = useQuery({
    queryKey: ["young_people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("young_people")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as YoungPerson[];
    },
  });

  const { data: mentorsMap = {} } = useQuery({
    queryKey: ["mentors-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email");
      const map: Record<string, string> = {};
      for (const p of data ?? []) map[p.id] = p.full_name ?? p.email ?? "—";
      return map;
    },
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-applications-count"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count } = await supabase
        .from("young_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");
      return count ?? 0;
    },
  });

  const { data: pendingFunilCount = 0 } = useQuery({
    queryKey: ["pending-funil-applications-count"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return jovens.filter((y) => {
      if (statusFilter !== "all" && y.status !== statusFilter) return false;
      if (phaseFilter !== "all" && y.trail_phase !== phaseFilter) return false;
      if (areaFilter !== "all" && y.vocation_area !== areaFilter && y.interest_area !== areaFilter) return false;
      if (!term) return true;
      return (
        y.full_name.toLowerCase().includes(term) ||
        (y.city ?? "").toLowerCase().includes(term) ||
        (y.vocation_area ?? "").toLowerCase().includes(term) ||
        (y.interest_area ?? "").toLowerCase().includes(term)
      );
    });
  }, [jovens, search, statusFilter, phaseFilter, areaFilter]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const y of jovens) counts[y.status] = (counts[y.status] ?? 0) + 1;
    return counts;
  }, [jovens]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase">Jovens</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de jovens em formação e seus percursos na trilha MTX
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
                <Link to="/jovens/inscricoes">
                  <Inbox className="mr-2 h-4 w-4" />
                  Legado
                  {pendingCount > 0 && (
                    <span className="ml-2 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-bold">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </Button>
            </div>
          )}
          {isSuperAdmin && (
            <Button variant="outline" onClick={() => setLinkOpen(true)} className="border-primary/20 hover:bg-primary/5">
              <Link2 className="mr-2 h-4 w-4 text-primary" /> Link de Inscrição
            </Button>
          )}
          {isAdmin && (
            <Button onClick={() => setOpenForm(true)} className="bg-gradient-mtx text-white font-bold shadow-mtx-glow">
              <Plus className="mr-2 h-4 w-4" /> Novo jovem
            </Button>
          )}
        </div>
      </div>

      {/* Funil visual */}
      <Card className="p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Funil de progresso
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["inscrito", "em_analise", "aprovado", "em_formacao", "em_pratica"] as YoungStatus[]).map((s, i, arr) => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(active ? "all" : s);
                  setPage(0);
                }}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card/40 hover:border-primary/40"
                }`}
              >
                <span className="font-semibold">{YOUNG_STATUS_LABELS[s]}</span>
                <span className="rounded-full bg-background/60 px-2 text-xs font-bold">
                  {statusCounts[s] ?? 0}
                </span>
                {i < arr.length - 1 && <span className="text-muted-foreground/50">→</span>}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cidade ou área..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {YOUNG_STATUS_LIST.map((s) => (
                <SelectItem key={s} value={s}>{YOUNG_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={phaseFilter} onValueChange={(v) => { setPhaseFilter(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Fase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fases</SelectItem>
              {TRAIL_PHASE_LIST.map((p) => (
                <SelectItem key={p} value={p}>{TRAIL_PHASE_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={areaFilter} onValueChange={(v) => { setAreaFilter(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {INTEREST_AREAS.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mentor</TableHead>
              <TableHead>Entrada</TableHead>
              {isAdmin && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={isAdmin ? 9 : 8}><Skeleton className="h-10 w-full" /></TableCell>
                </TableRow>
              ))
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 9 : 8} className="py-10 text-center text-muted-foreground">
                  Nenhum jovem encontrado
                </TableCell>
              </TableRow>
            ) : (
              paged.map((y) => (
                <TableRow key={y.id} className="cursor-pointer">
                  <TableCell>
                    <Link to="/jovens/$id" params={{ id: y.id }} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {y.photo_url && <AvatarImage src={y.photo_url} />}
                        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                          {y.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{y.full_name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>{y.age ?? "—"}</TableCell>
                  <TableCell>{y.city ?? "—"}</TableCell>
                  <TableCell>{y.interest_area ?? "—"}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <PhaseBadge phase={y.trail_phase} />
                      <ProgressMini youngId={y.id} profileId={y.profile_id} phase={y.trail_phase} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={y.status as YoungStatus} />
                      <StuckBadge lastProgressAt={y.last_progress_at} entryDate={y.entry_date} createdAt={y.created_at} />
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {y.mentor_id ? mentorsMap[y.mentor_id] ?? "—" : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {y.entry_date ? new Date(y.entry_date).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <RowActionsMenu
                        label={y.full_name}
                        onView={() => navigate({ to: "/jovens/$id", params: { id: y.id } })}
                        onEdit={() => navigate({ to: "/jovens/$id", params: { id: y.id } })}
                        onDuplicate={async () => {
                          try {
                            const copy = await duplicateRow<{ id: string }>(
                              "young_people",
                              y.id,
                              {
                                labelField: "full_name",
                                excludeFields: ["profile_id", "cpf", "rg", "email"],
                                overrides: { status: "inscrito", profile_id: null },
                              },
                            );
                            await logActivity({
                              action: "young_duplicated",
                              entity_type: "young_people",
                              entity_id: copy.id,
                              description: `Jovem "${y.full_name}" duplicado`,
                            });
                            toast.success("Jovem duplicado");
                            qc.invalidateQueries({ queryKey: ["young-people"] });
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                        onDelete={() => setToDelete(y)}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-border p-3 text-sm">
            <span className="text-muted-foreground">
              {filtered.length} jovens • página {page + 1} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      <YoungFormDialog open={openForm} onOpenChange={setOpenForm} />
      <InscricaoLinkDialog open={linkOpen} onOpenChange={setLinkOpen} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir jovem"
        description={
          <>
            Tem certeza que deseja excluir <strong>{toDelete?.full_name}</strong>?
            Essa ação não pode ser desfeita e todos os dados relacionados serão removidos.
          </>
        }
        confirmLabel="Excluir"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete)}
      />
    </div>
  );
}

function StuckBadge({ lastProgressAt, entryDate, createdAt }: { lastProgressAt: string | null | undefined, entryDate: string | null | undefined, createdAt: string | null | undefined }) {
  if (!lastProgressAt) return null;

  let referenceDate = new Date(lastProgressAt).getTime();
  
  if (createdAt && entryDate) {
    const createdTime = new Date(createdAt).getTime();
    if (Math.abs(referenceDate - createdTime) < 5000) {
      referenceDate = new Date(entryDate).getTime();
    }
  }

  const days = Math.floor((Date.now() - referenceDate) / 86_400_000);
  if (days >= 14)
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
        🔴 Inativo ({days}d)
      </span>
    );
  if (days >= 7)
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
        ⚠️ Travado ({days}d)
      </span>
    );
  return null;
}

function ProgressMini({ youngId, profileId }: { youngId: string; profileId?: string | null; phase?: string | null }) {
  // profile_id é o auth.users.id — sem ele não há como buscar progresso
  const { data } = useQuery({
    queryKey: ["young-progress-mini", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const [{ count: totalModules }, { count: doneModules }] = await Promise.all([
        supabase.from("journey_modules").select("id", { count: "exact", head: true }),
        supabase.from("user_module_progress").select("id", { count: "exact", head: true })
          .eq("user_id", profileId!).eq("completed", true),
      ]);
      const total = totalModules ?? 0;
      const done = doneModules ?? 0;
      return total > 0 ? Math.round((done / total) * 100) : 0;
    },
  });
  const pct = data ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{pct}%</span>
    </div>
  );
}

