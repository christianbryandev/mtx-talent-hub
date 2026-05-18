import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import {
  Plus, Search, MessageSquare, CheckSquare, Calendar as CalendarIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TaskFormDialog } from "@/components/tarefas/TaskFormDialog";
import { TaskDrawer } from "@/components/tarefas/TaskDrawer";
import {
  KANBAN_COLUMNS, PRIORITY_STYLE, type KanbanColumn, type Task,
} from "@/types/tasks";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — MTX Hub" }] }),
  component: TarefasKanbanPage,
});

interface TaskRow extends Task {
  clients?: { company_name: string } | null;
  services?: { name: string } | null;
  young_people?: { full_name: string; photo_url: string | null } | null;
  _checklist_total?: number;
  _checklist_done?: number;
  _comments_count?: number;
}

function TarefasKanbanPage() {
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [newColumn, setNewColumn] = useState<KanbanColumn>("backlog");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [youngFilter, setYoungFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`*,
          clients(company_name),
          services(name),
          young_people:young_responsible(full_name, photo_url)
        `)
        .order("position");
      if (error) throw error;

      const ids = (data ?? []).map((t) => t.id);
      let checklistMap: Record<string, { total: number; done: number }> = {};
      let commentMap: Record<string, number> = {};
      if (ids.length) {
        const [{ data: cls }, { data: cms }] = await Promise.all([
          supabase.from("task_checklists").select("task_id, completed").in("task_id", ids),
          supabase.from("task_comments").select("task_id").in("task_id", ids),
        ]);
        for (const c of cls ?? []) {
          const m = checklistMap[c.task_id] ?? { total: 0, done: 0 };
          m.total++; if (c.completed) m.done++;
          checklistMap[c.task_id] = m;
        }
        for (const c of cms ?? []) {
          commentMap[c.task_id] = (commentMap[c.task_id] ?? 0) + 1;
        }
      }
      return (data ?? []).map((t) => ({
        ...(t as unknown as TaskRow),
        _checklist_total: checklistMap[t.id]?.total ?? 0,
        _checklist_done: checklistMap[t.id]?.done ?? 0,
        _comments_count: commentMap[t.id] ?? 0,
      })) as TaskRow[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, company_name").order("company_name");
      return data ?? [];
    },
  });
  const { data: services = [] } = useQuery({
    queryKey: ["services-min"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("id, name").order("name");
      return data ?? [];
    },
  });
  const { data: youngs = [] } = useQuery({
    queryKey: ["youngs-min"],
    queryFn: async () => {
      const { data } = await supabase.from("young_people").select("id, full_name").order("full_name");
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (clientFilter !== "all" && t.client_id !== clientFilter) return false;
      if (youngFilter !== "all" && t.young_responsible !== youngFilter) return false;
      if (serviceFilter !== "all" && t.service_id !== serviceFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, search, clientFilter, youngFilter, serviceFilter, priorityFilter]);

  const byColumn = useMemo(() => {
    const map: Record<KanbanColumn, TaskRow[]> = {} as never;
    KANBAN_COLUMNS.forEach((c) => (map[c.id] = []));
    filtered.forEach((t) => map[t.kanban_column]?.push(t));
    return map;
  }, [filtered]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const moveTask = useMutation({
    mutationFn: async ({ id, column }: { id: string; column: KanbanColumn }) => {
      const patch: Record<string, unknown> = { kanban_column: column };
      if (column === "concluido") patch.completed_at = new Date().toISOString();
      const { error } = await supabase.from("tasks").update(patch as never).eq("id", id);
      if (error) throw error;
      await supabase.from("activity_logs").insert({
        action: "task_moved",
        entity_type: "task",
        entity_id: id,
        description: `Tarefa movida para ${column}`,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      } as never);
    },
    onMutate: async ({ id, column }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData<TaskRow[]>(["tasks"]);
      qc.setQueryData<TaskRow[]>(["tasks"], (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, kanban_column: column } : t)),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
      toast.error(e.message);
    },
    onSuccess: () => toast.success("Tarefa movida"),
  });

  const handleDragStart = (e: DragStartEvent) => setDraggingId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    const id = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const t = tasks.find((x) => x.id === id);
    if (!t || t.kanban_column === overId) return;
    moveTask.mutate({ id, column: overId as KanbanColumn });
  };

  const lateCount = tasks.filter((t) => {
    if (!t.due_date || t.kanban_column === "concluido") return false;
    return t.due_date < new Date().toISOString().slice(0, 10);
  }).length;

  const draggingTask = draggingId ? tasks.find((t) => t.id === draggingId) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tarefas / Kanban</h1>
          <p className="text-sm text-muted-foreground">
            Quadro operacional da equipe
            {lateCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px]">
                {lateCount} atrasada{lateCount > 1 ? "s" : ""}
              </Badge>
            )}
          </p>
        </div>
        <Button size="sm" onClick={() => { setNewColumn("backlog"); setOpenNew(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova tarefa
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarefa..." className="pl-8"
          />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos clientes</SelectItem>
            {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={youngFilter} onValueChange={setYoungFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Jovem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos jovens</SelectItem>
            {youngs.map((y) => (<SelectItem key={y.id} value={y.id}>{y.full_name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Serviço" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos serviços</SelectItem>
            {services.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
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
            {KANBAN_COLUMNS.map((col) => {
              const items = byColumn[col.id] ?? [];
              return (
                <Column
                  key={col.id} id={col.id} title={col.label} count={items.length}
                  onAdd={() => { setNewColumn(col.id); setOpenNew(true); }}
                >
                  {items.map((t) => (
                    <TaskCard
                      key={t.id} task={t}
                      onClick={() => { setDrawerId(t.id); setDrawerOpen(true); }}
                    />
                  ))}
                </Column>
              );
            })}
          </div>
          <DragOverlay>
            {draggingTask ? <TaskCard task={draggingTask} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskFormDialog open={openNew} onOpenChange={setOpenNew} defaultColumn={newColumn} />
      <TaskDrawer taskId={drawerId} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}

function Column({
  id, title, count, onAdd, children,
}: {
  id: string; title: string; count: number; onAdd: () => void; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-[280px] shrink-0 flex-col rounded-lg border bg-card/50 ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <Badge variant="secondary" className="text-[10px]">{count}</Badge>
        </div>
        <button className="text-muted-foreground hover:text-foreground" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}

function TaskCard({ task, onClick, dragging }: { task: TaskRow; onClick?: () => void; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const today = new Date().toISOString().slice(0, 10);
  const isLate = task.due_date && task.due_date < today && task.kanban_column !== "concluido";

  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      onClick={(e) => { if (isDragging) return; e.stopPropagation(); onClick?.(); }}
      className={`cursor-grab rounded-md border bg-card p-3 shadow-sm transition hover:shadow-md ${
        isDragging || dragging ? "opacity-50" : ""
      } ${isLate ? "border-destructive/60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium leading-tight flex-1">{task.title}</p>
        <Badge variant="outline" className={`text-[9px] ${PRIORITY_STYLE[task.priority]}`}>
          {task.priority}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {task.clients?.company_name && (
          <Badge variant="secondary" className="text-[9px]">{task.clients.company_name}</Badge>
        )}
        {task.services?.name && (
          <Badge variant="outline" className="text-[9px]">{task.services.name}</Badge>
        )}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {task.young_people?.full_name && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[8px]">
                {task.young_people.full_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          {(task._checklist_total ?? 0) > 0 && (
            <span className="flex items-center gap-0.5">
              <CheckSquare className="h-3 w-3" />
              {task._checklist_done}/{task._checklist_total}
            </span>
          )}
          {(task._comments_count ?? 0) > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {task._comments_count}
            </span>
          )}
        </div>
        {task.due_date && (
          <span className={`flex items-center gap-0.5 ${isLate ? "text-destructive font-medium" : ""}`}>
            <CalendarIcon className="h-3 w-3" />
            {new Date(task.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}
