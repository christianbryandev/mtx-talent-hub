import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Inbox, Link2, Trash2 } from "lucide-react";
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
  const { user } = useAuth();
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
      await supabase.from("young_evolution").delete().eq("young_id", y.id);
      await supabase.from("young_attendance").delete().eq("young_id", y.id);
      const { error } = await supabase.from("young_people").delete().eq("id", y.id);
      if (error) throw error;
      await supabase.from("activity_logs").insert({
        user_id: user?.id ?? null,
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
          <h1 className="text-2xl font-bold tracking-tight">Jovens</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de jovens em formação e seus percursos na trilha MTX
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" asChild>
              <Link to="/jovens/inscricoes">
                <Inbox className="mr-2 h-4 w-4" />
                Inscrições
                {pendingCount > 0 && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </Button>
          )}
          {isSuperAdmin && (
            <Button variant="outline" onClick={() => setLinkOpen(true)}>
              <Link2 className="mr-2 h-4 w-4" /> Gerar link de inscrição
            </Button>
          )}
          {isAdmin && (
            <Button onClick={() => setOpenForm(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo jovem
            </Button>
          )}
        </div>
      </div>

      {/* Contador por status */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {YOUNG_STATUS_LIST.slice(0, 5).map((s) => (
          <Card key={s} className="p-3">
            <div className="text-xs text-muted-foreground">{YOUNG_STATUS_LABELS[s]}</div>
            <div className="mt-1 text-2xl font-bold">{statusCounts[s] ?? 0}</div>
          </Card>
        ))}
      </div>

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
              <TableHead>Jovem</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mentor</TableHead>
              <TableHead>Entrada</TableHead>
              {isSuperAdmin && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={isSuperAdmin ? 8 : 7}><Skeleton className="h-10 w-full" /></TableCell>
                </TableRow>
              ))
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 8 : 7} className="py-10 text-center text-muted-foreground">
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
                  <TableCell><PhaseBadge phase={y.trail_phase} /></TableCell>
                  <TableCell><StatusBadge status={y.status as YoungStatus} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {y.mentor_id ? mentorsMap[y.mentor_id] ?? "—" : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {y.entry_date ? new Date(y.entry_date).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setToDelete(y); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
    </div>
  );
}
