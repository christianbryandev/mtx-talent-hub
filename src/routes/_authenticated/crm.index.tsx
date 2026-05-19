import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Target,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  List as ListIcon,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { OpportunityFormDialog } from "@/components/crm/OpportunityFormDialog";
import {
  FUNNEL_STAGES,
  type FunnelStage,
  type Opportunity,
  type OpportunityPriority,
} from "@/types/crm";
import { RowActionsMenu } from "@/components/shared/RowActionsMenu";
import { usePermissions } from "@/hooks/usePermissions";
import { deleteOpportunityCascade } from "@/lib/cascade-delete";
import { duplicateRow } from "@/lib/duplicate-row";
import { logActivity } from "@/lib/activity-log";

export const Route = createFileRoute("/_authenticated/crm/")({
  head: () => ({ meta: [{ title: "CRM Comercial — MTX Hub" }] }),
  component: CrmKanbanPage,
});

const PRIORITY_STYLE: Record<OpportunityPriority, string> = {
  alta: "bg-destructive/15 text-destructive border-destructive/30",
  media: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  baixa: "bg-muted text-muted-foreground border-border",
};

const brl = (v: number | null) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v ?? 0);

function CrmKanbanPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { isAdmin, isComercial } = usePermissions();
  const canManage = isAdmin || isComercial;
  const [openNew, setOpenNew] = useState(false);
  const [search, setSearch] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Opportunity[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      return data ?? [];
    },
  });

  const niches = useMemo(
    () => Array.from(new Set(opportunities.map((o) => o.niche).filter(Boolean))) as string[],
    [opportunities],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return opportunities.filter((o) => {
      if (q && !`${o.company_name} ${o.contact_name ?? ""}`.toLowerCase().includes(q))
        return false;
      if (responsibleFilter !== "all" && o.commercial_responsible !== responsibleFilter)
        return false;
      if (priorityFilter !== "all" && o.priority !== priorityFilter) return false;
      if (nicheFilter !== "all" && o.niche !== nicheFilter) return false;
      return true;
    });
  }, [opportunities, search, responsibleFilter, priorityFilter, nicheFilter]);

  const open = filtered.filter((o) => o.status === "aberta");

  const byStage = useMemo(() => {
    const map: Record<FunnelStage, Opportunity[]> = {} as never;
    FUNNEL_STAGES.forEach((s) => (map[s.id] = []));
    open.forEach((o) => map[o.funnel_stage]?.push(o));
    return map;
  }, [open]);

  // KPIs
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const totalOpen = opportunities.filter((o) => o.status === "aberta").length;
  const pipelineValue = opportunities
    .filter((o) => o.status === "aberta")
    .reduce((s, o) => s + Number(o.estimated_value ?? 0), 0);
  const closedThisMonth = opportunities.filter(
    (o) => o.status !== "aberta" && (o.updated_at ?? "") >= startOfMonth,
  );
  const wonThisMonth = closedThisMonth.filter((o) => o.status === "ganha").length;
  const conversion = closedThisMonth.length
    ? Math.round((wonThisMonth / closedThisMonth.length) * 100)
    : 0;
  const todayIso = now.toISOString().slice(0, 10);
  const lateFollowups = opportunities.filter(
    (o) => o.status === "aberta" && o.next_followup_date && o.next_followup_date < todayIso,
  ).length;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: FunnelStage }) => {
      const { error } = await supabase
        .from("opportunities")
        .update({ funnel_stage: stage } as never)
        .eq("id", id);
      if (error) throw error;
      await supabase.from("activity_logs").insert({
        action: "opportunity_stage_changed",
        entity_type: "opportunity",
        entity_id: id,
        description: `Etapa alterada para ${stage}`,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      } as never);
    },
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ["opportunities"] });
      const prev = qc.getQueryData<Opportunity[]>(["opportunities"]);
      qc.setQueryData<Opportunity[]>(["opportunities"], (old) =>
        (old ?? []).map((o) => (o.id === id ? { ...o, funnel_stage: stage } : o)),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["opportunities"], ctx.prev);
      toast.error(e.message);
    },
    onSuccess: () => toast.success("Etapa atualizada"),
  });

  const handleDragStart = (e: DragStartEvent) => setDraggingId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    const id = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const opp = opportunities.find((o) => o.id === id);
    if (!opp || opp.funnel_stage === overId) return;
    updateStageMutation.mutate({ id, stage: overId as FunnelStage });
  };

  const draggingOpp = draggingId ? opportunities.find((o) => o.id === draggingId) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM Comercial</h1>
          <p className="text-sm text-muted-foreground">
            Funil de vendas, oportunidades e propostas
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/crm/lista">
              <ListIcon className="h-4 w-4 mr-1" /> Visão lista
            </Link>
          </Button>
          <Button size="sm" onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova oportunidade
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <KpiCard label="Oportunidades abertas" value={totalOpen} icon={<Target className="h-4 w-4" />} />
        <KpiCard label="Pipeline (R$)" value={brl(pipelineValue)} icon={<DollarSign className="h-4 w-4" />} />
        <KpiCard label="Ganhas no mês" value={wonThisMonth} icon={<CheckCircle2 className="h-4 w-4" />} />
        <KpiCard label="Conversão do mês" value={`${conversion}%`} icon={<Target className="h-4 w-4" />} />
        <KpiCard
          label="Follow-ups atrasados"
          value={lateFollowups}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por empresa ou contato..."
            className="pl-8"
          />
        </div>
        <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos responsáveis</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={nicheFilter} onValueChange={setNicheFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Nicho" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos nichos</SelectItem>
            {niches.map((n) => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[400px] w-[280px] shrink-0" />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {FUNNEL_STAGES.map((stage) => {
              const items = byStage[stage.id] ?? [];
              const stageValue = items.reduce(
                (s, o) => s + Number(o.estimated_value ?? 0),
                0,
              );
              return (
                <KanbanColumn
                  key={stage.id}
                  id={stage.id}
                  title={stage.label}
                  count={items.length}
                  totalValue={brl(stageValue)}
                >
                  {items.map((o) => (
                    <OpportunityCard
                      key={o.id}
                      opp={o}
                      onClick={() =>
                        navigate({ to: "/crm/$id", params: { id: o.id } })
                      }
                      actions={
                        <RowActionsMenu
                          label={o.company_name}
                          onView={() => navigate({ to: "/crm/$id", params: { id: o.id } })}
                          onEdit={
                            canManage
                              ? () => navigate({ to: "/crm/$id", params: { id: o.id } })
                              : undefined
                          }
                          onDuplicate={
                            canManage
                              ? async () => {
                                  try {
                                    const copy = await duplicateRow<{ id: string }>(
                                      "opportunities",
                                      o.id,
                                      {
                                        labelField: "company_name",
                                        excludeFields: ["converted_client_id"],
                                      },
                                    );
                                    await logActivity({
                                      action: "opportunity_duplicated",
                                      entity_type: "opportunity",
                                      entity_id: copy.id,
                                      description: `Oportunidade "${o.company_name}" duplicada`,
                                    });
                                    toast.success("Oportunidade duplicada");
                                    qc.invalidateQueries({ queryKey: ["opportunities"] });
                                  } catch (e) {
                                    toast.error((e as Error).message);
                                  }
                                }
                              : undefined
                          }
                          onDelete={
                            isAdmin
                              ? async () => {
                                  try {
                                    await deleteOpportunityCascade(o.id);
                                    await logActivity({
                                      action: "opportunity_deleted",
                                      entity_type: "opportunity",
                                      entity_id: o.id,
                                      description: `Oportunidade "${o.company_name}" excluída`,
                                    });
                                    toast.success("Oportunidade excluída");
                                    qc.invalidateQueries({ queryKey: ["opportunities"] });
                                  } catch (e) {
                                    toast.error((e as Error).message);
                                  }
                                }
                              : undefined
                          }
                        />
                      }
                    />
                  ))}
                </KanbanColumn>
              );
            })}
          </div>
          <DragOverlay>
            {draggingOpp ? <OpportunityCard opp={draggingOpp} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <OpportunityFormDialog open={openNew} onOpenChange={setOpenNew} />
    </div>
  );
}

function KanbanColumn({
  id,
  title,
  count,
  totalValue,
  children,
}: {
  id: string;
  title: string;
  count: number;
  totalValue: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-[280px] shrink-0 flex-col rounded-lg border bg-card/50 ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{title}</span>
          <Badge variant="secondary" className="text-[10px]">{count}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{totalValue}</p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}

function OpportunityCard({
  opp,
  onClick,
  dragging,
}: {
  opp: Opportunity;
  onClick?: () => void;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: opp.id });
  const today = new Date().toISOString().slice(0, 10);
  const isLate = opp.next_followup_date && opp.next_followup_date < today;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onClick?.();
      }}
      className={`cursor-grab rounded-md border bg-card p-3 shadow-sm transition hover:shadow-md ${
        isDragging || dragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold">{opp.company_name}</p>
          {opp.contact_name && (
            <p className="truncate text-xs text-muted-foreground">{opp.contact_name}</p>
          )}
        </div>
        <Badge variant="outline" className={`text-[9px] ${PRIORITY_STYLE[opp.priority]}`}>
          {opp.priority}
        </Badge>
      </div>
      {opp.niche && (
        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {opp.niche}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-medium">{brl(opp.estimated_value)}</span>
        {opp.closing_probability != null && (
          <span className="text-muted-foreground">{opp.closing_probability}%</span>
        )}
      </div>
      {opp.next_followup_date && (
        <p className={`mt-1 text-[10px] ${isLate ? "text-destructive font-medium" : "text-muted-foreground"}`}>
          {isLate ? "⚠ Atrasado: " : "Follow-up: "}
          {new Date(opp.next_followup_date).toLocaleDateString("pt-BR")}
        </p>
      )}
    </div>
  );
}
