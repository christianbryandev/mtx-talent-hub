import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Send, Loader2 } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { logActivity } from "@/lib/activity-log";
import {
  ClientSearchSelect,
  ServiceSearchSelect,
} from "@/components/shared/RelationalSelects";
import { YoungSearchSelect } from "@/components/shared/YoungSearchSelect";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  KANBAN_COLUMNS, PRIORITY_LABELS, type Task, type TaskPriority, type KanbanColumn,
} from "@/types/tasks";

interface Props {
  taskId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function TaskDrawer({ taskId, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { isSuperAdmin } = usePermissions();
  const [comment, setComment] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editingDesc, setEditingDesc] = useState<string | null>(null);

  const { data: task } = useQuery({
    queryKey: ["task", taskId],
    enabled: !!taskId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks").select("*").eq("id", taskId!).maybeSingle();
      if (error) throw error;
      return data as unknown as Task | null;
    },
  });

  const { data: checklist = [] } = useQuery({
    queryKey: ["task-checklist", taskId],
    enabled: !!taskId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("task_checklists").select("*").eq("task_id", taskId!)
        .order("position");
      return (data ?? []) as Array<{
        id: string; item: string; completed: boolean;
        completed_at: string | null; position: number;
      }>;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["task-comments", taskId],
    enabled: !!taskId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("task_comments")
        .select("id, content, created_at, author_id, profiles(full_name, email)")
        .eq("task_id", taskId!).order("created_at");
      return (data ?? []) as Array<{
        id: string; content: string; created_at: string; author_id: string | null;
        profiles: { full_name: string | null; email: string | null } | null;
      }>;
    },
  });




  const updateTask = useMutation({
    mutationFn: async (patch: Partial<Task>) => {
      const { error } = await supabase.from("tasks").update(patch as never).eq("id", taskId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addChecklist = useMutation({
    mutationFn: async (item: string) => {
      const { error } = await supabase.from("task_checklists").insert({
        task_id: taskId, item, position: checklist.length,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewChecklistItem("");
      qc.invalidateQueries({ queryKey: ["task-checklist", taskId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleChecklist = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("task_checklists").update({
        completed, completed_at: completed ? new Date().toISOString() : null,
      } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-checklist", taskId] }),
  });

  const removeChecklist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_checklists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-checklist", taskId] }),
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase.from("task_comments").insert({
        task_id: taskId, author_id: userId, content,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["task-comments", taskId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTask = useMutation({
    mutationFn: async () => {
      if (!taskId) return;
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
      await logActivity({
        action: "task_deleted",
        entity_type: "task",
        entity_id: taskId,
        description: `Tarefa "${task?.title ?? ""}" excluída`,
      });
    },
    onSuccess: () => {
      toast.success("Tarefa excluída");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!task) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto" />
      </Sheet>
    );
  }

  const checklistDone = checklist.filter((c) => c.completed).length;
  const checklistPct = checklist.length ? (checklistDone / checklist.length) * 100 : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {editingTitle !== null ? (
              <Input
                autoFocus value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => {
                  if (editingTitle && editingTitle !== task.title) {
                    updateTask.mutate({ title: editingTitle });
                  }
                  setEditingTitle(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              />
            ) : (
              <button
                className="text-left w-full hover:bg-muted/50 rounded px-1 -mx-1"
                onClick={() => setEditingTitle(task.title)}
              >
                {task.title}
              </button>
            )}
          </SheetTitle>
          {isSuperAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-12 top-4 h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é irreversível. A tarefa "{task.title}" e todos os seus
                    comentários, checklist e anexos serão removidos permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteTask.mutate()}
                  >
                    Excluir definitivamente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Coluna</Label>
              <Select
                value={task.kanban_column}
                onValueChange={(v) => updateTask.mutate({ kanban_column: v as KanbanColumn })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KANBAN_COLUMNS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prioridade</Label>
              <Select
                value={task.priority}
                onValueChange={(v) => updateTask.mutate({ priority: v as TaskPriority })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Data de prazo</Label>
              <Input
                type="date" defaultValue={task.due_date ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (task.due_date ?? "")) {
                    updateTask.mutate({ due_date: e.target.value || null });
                  }
                }}
              />
            </div>
            <div>
              <Label className="text-xs">Horas estimadas</Label>
              <Input
                type="number" step="0.5" defaultValue={task.estimated_hours ?? ""}
                onBlur={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  if (val !== task.estimated_hours) updateTask.mutate({ estimated_hours: val });
                }}
              />
            </div>
            <div>
              <Label className="text-xs">Cliente</Label>
              <ClientSearchSelect
                value={task.client_id ?? null}
                onChange={(v) => updateTask.mutate({ client_id: v })}
              />
            </div>
            <div>
              <Label className="text-xs">Serviço</Label>
              <ServiceSearchSelect
                value={task.service_id ?? null}
                onChange={(v) => updateTask.mutate({ service_id: v })}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Jovem responsável</Label>
              <YoungSearchSelect
                value={task.young_responsible ?? null}
                onChange={(v) => updateTask.mutate({ young_responsible: v })}
              />
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs">Descrição</Label>
            {editingDesc !== null ? (
              <Textarea
                autoFocus value={editingDesc} rows={4}
                onChange={(e) => setEditingDesc(e.target.value)}
                onBlur={() => {
                  if (editingDesc !== (task.description ?? "")) {
                    updateTask.mutate({ description: editingDesc || null });
                  }
                  setEditingDesc(null);
                }}
              />
            ) : (
              <button
                className="text-left w-full min-h-[60px] p-2 text-sm rounded border bg-muted/30 hover:bg-muted/50 whitespace-pre-wrap"
                onClick={() => setEditingDesc(task.description ?? "")}
              >
                {task.description || (
                  <span className="text-muted-foreground italic">Clique para adicionar...</span>
                )}
              </button>
            )}
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">
                Checklist ({checklistDone}/{checklist.length})
              </Label>
            </div>
            {checklist.length > 0 && <Progress value={checklistPct} className="h-1.5 mb-2" />}
            <div className="space-y-1">
              {checklist.map((c) => (
                <div key={c.id} className="flex items-center gap-2 group">
                  <Checkbox
                    checked={c.completed}
                    onCheckedChange={(v) => toggleChecklist.mutate({ id: c.id, completed: !!v })}
                  />
                  <span className={`flex-1 text-sm ${c.completed ? "line-through text-muted-foreground" : ""}`}>
                    {c.item}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => removeChecklist.mutate(c.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={newChecklistItem} placeholder="Novo item..."
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newChecklistItem.trim()) {
                    addChecklist.mutate(newChecklistItem.trim());
                  }
                }}
              />
              <Button
                size="sm" variant="outline"
                disabled={!newChecklistItem.trim()}
                onClick={() => addChecklist.mutate(newChecklistItem.trim())}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-semibold">Comentários ({comments.length})</Label>
            <div className="space-y-3 mt-2 max-h-60 overflow-y-auto">
              {comments.map((c) => {
                const name = c.profiles?.full_name || c.profiles?.email || "Usuário";
                return (
                  <div key={c.id} className="flex gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px]">
                        {name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(c.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                );
              })}
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <Textarea
                value={comment} rows={2} placeholder="Adicione um comentário..."
                onChange={(e) => setComment(e.target.value)}
              />
              <Button
                size="sm" disabled={!comment.trim() || addComment.isPending}
                onClick={() => addComment.mutate(comment.trim())}
              >
                {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 pt-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              Criada {new Date(task.created_at).toLocaleDateString("pt-BR")}
            </Badge>
            {task.completed_at && (
              <Badge variant="outline" className="text-[10px]">
                Concluída {new Date(task.completed_at).toLocaleDateString("pt-BR")}
              </Badge>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
