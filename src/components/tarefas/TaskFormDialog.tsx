import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  ClientSearchSelect,
  ServiceSearchSelect,
  ProfileSearchSelect,
} from "@/components/shared/RelationalSelects";
import { YoungSearchSelect } from "@/components/shared/YoungSearchSelect";
import {
  KANBAN_COLUMNS, PRIORITY_LABELS, TASK_AREAS,
  type KanbanColumn, type TaskPriority,
} from "@/types/tasks";

const schema = z.object({
  title: z.string().min(2, "Título obrigatório").max(200),
  description: z.string().max(3000).optional().or(z.literal("")),
  client_id: z.string().optional().or(z.literal("")),
  service_id: z.string().optional().or(z.literal("")),
  opportunity_id: z.string().optional().or(z.literal("")),
  young_responsible: z.string().optional().or(z.literal("")),
  supervisor_id: z.string().optional().or(z.literal("")),
  area: z.string().optional().or(z.literal("")),
  priority: z.string(),
  kanban_column: z.string(),
  start_date: z.string().optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
  estimated_hours: z.string().optional().or(z.literal("")),
  checklist_text: z.string().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultColumn?: KanbanColumn;
}

export function TaskFormDialog({ open, onOpenChange, defaultColumn }: Props) {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Array<{ service_id: string; service_name: string; young_responsible: string | null }>>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      priority: "media",
      kanban_column: defaultColumn ?? "backlog",
    },
  });

  useEffect(() => {
    if (defaultColumn) form.setValue("kanban_column", defaultColumn);
  }, [defaultColumn, form]);

  // Fetch client services when client is selected
  const clientId = form.watch("client_id") || null;
  const { data: clientServices = [] } = useQuery({
    queryKey: ["client-services-for-task", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from("client_services")
        .select("service_id, service_name, status, services(name)")
        .eq("client_id", clientId)
        .eq("status", "ativo");
      return (data ?? []).map((s: any) => ({
        service_id: s.service_id,
        service_name: s.services?.name ?? s.service_name ?? "Serviço",
      }));
    },
    enabled: !!clientId,
  });

  // Auto-fill fields when client is selected or changed
  const handleClientChange = async (newClientId: string | null) => {
    form.setValue("client_id", newClientId ?? "");
    form.setValue("young_responsible", "");
    form.setValue("supervisor_id", "");
    form.setValue("service_id", "");
    setSelectedServices([]);

    if (!newClientId) return;

    const { data: client } = await supabase
      .from("clients")
      .select("young_responsible, commercial_responsible")
      .eq("id", newClientId)
      .single();

    if (client) {
      if (client.young_responsible) {
        form.setValue("young_responsible", client.young_responsible);
      }
      if (client.commercial_responsible) {
        form.setValue("supervisor_id", client.commercial_responsible);
      }
    }
  };

  const toggleService = (serviceId: string, serviceName: string) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.service_id === serviceId);
      if (exists) return prev.filter((s) => s.service_id !== serviceId);
      return [...prev, { service_id: serviceId, service_name: serviceName, young_responsible: null }];
    });
  };

  const setServiceYoung = (serviceId: string, youngId: string | null) => {
    setSelectedServices((prev) =>
      prev.map((s) => s.service_id === serviceId ? { ...s, young_responsible: youngId } : s)
    );
  };




  const mutation = useMutation({
    mutationFn: async (v: FormValues) => {
      setSubmitting(true);
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const payload = {
        title: v.title,
        description: v.description || null,
        client_id: v.client_id || null,
        service_id: selectedServices.length > 0 ? selectedServices[0].service_id : (v.service_id || null),
        opportunity_id: v.opportunity_id || null,
        young_responsible: v.young_responsible || null,
        supervisor_id: v.supervisor_id || null,
        area: v.area || null,
        priority: v.priority,
        kanban_column: v.kanban_column,
        start_date: v.start_date || null,
        due_date: v.due_date || null,
        estimated_hours: v.estimated_hours ? Number(v.estimated_hours) : null,
        created_by: userId ?? null,
      };
      const { data, error } = await supabase
        .from("tasks").insert(payload as never).select("id").single();
      if (error) throw error;
      const taskId = data.id as string;

      // Insert task_services for multi-service tasks
      if (selectedServices.length > 0) {
        const { error: tsError } = await supabase.from("task_services").insert(
          selectedServices.map((s) => ({
            task_id: taskId,
            service_id: s.service_id,
            young_responsible: s.young_responsible || null,
          })) as never
        );
        if (tsError) console.error("task_services insert error:", tsError);
      }

      const items = (v.checklist_text ?? "")
        .split("\n").map((l) => l.trim()).filter(Boolean);
      if (items.length > 0) {
        await supabase.from("task_checklists").insert(
          items.map((item, i) => ({ task_id: taskId, item, position: i })) as never,
        );
      }

      await supabase.from("activity_logs").insert({
        action: "task_created",
        entity_type: "task",
        entity_id: taskId,
        description: `Tarefa "${v.title}" criada`,
        user_id: userId,
      } as never);

      return taskId;
    },
    onSuccess: () => {
      toast.success("Tarefa criada");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      form.reset({ title: "", priority: "media", kanban_column: defaultColumn ?? "backlog" });
      setSelectedServices([]);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setSubmitting(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Título *</Label>
              <Input {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea rows={3} {...form.register("description")} />
            </div>
            <div>
              <Label>Cliente</Label>
              <ClientSearchSelect
                value={form.watch("client_id") || null}
                onChange={handleClientChange}
              />
            </div>
            <div>
              <Label>Serviço</Label>
              {clientServices.length === 0 ? (
                <ServiceSearchSelect
                  value={form.watch("service_id") || null}
                  onChange={(v) => form.setValue("service_id", v ?? "")}
                  clientId={form.watch("client_id") || null}
                />
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Selecione abaixo</p>
              )}
            </div>
            {clientServices.length > 0 && (
              <div className="md:col-span-2 space-y-2 rounded-md border p-3 bg-muted/20">
                <p className="text-xs font-medium">Serviços do cliente (selecione os desejados)</p>
                {clientServices.map((cs) => {
                  const selected = selectedServices.find((s) => s.service_id === cs.service_id);
                  return (
                    <div key={cs.service_id} className="flex items-center gap-3 py-1">
                      <Checkbox
                        checked={!!selected}
                        onCheckedChange={() => toggleService(cs.service_id, cs.service_name)}
                      />
                      <span className="text-sm flex-1">{cs.service_name}</span>
                      {selected && (
                        <div className="w-48">
                          <YoungSearchSelect
                            value={selected.young_responsible}
                            onChange={(v) => setServiceYoung(cs.service_id, v)}
                            placeholder="Jovem responsável"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div>
              <Label>Jovem responsável</Label>
              <YoungSearchSelect
                value={form.watch("young_responsible") || null}
                onChange={(v) => form.setValue("young_responsible", v ?? "")}
              />
            </div>
            <div>
              <Label>Supervisor</Label>
              <ProfileSearchSelect
                value={form.watch("supervisor_id") || null}
                onChange={(v) => form.setValue("supervisor_id", v ?? "")}
              />
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.watch("priority")} onValueChange={(v) => form.setValue("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Coluna inicial</Label>
              <Select value={form.watch("kanban_column")} onValueChange={(v) => form.setValue("kanban_column", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KANBAN_COLUMNS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Área</Label>
              <Select value={form.watch("area") || ""} onValueChange={(v) => form.setValue("area", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {TASK_AREAS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de início</Label>
              <Input type="date" {...form.register("start_date")} />
            </div>
            <div>
              <Label>Data de prazo</Label>
              <Input type="date" {...form.register("due_date")} />
            </div>
            <div>
              <Label>Horas estimadas</Label>
              <Input type="number" step="0.5" {...form.register("estimated_hours")} />
            </div>
            <div className="md:col-span-2">
              <Label>Checklist (um item por linha)</Label>
              <Textarea rows={3} {...form.register("checklist_text")} placeholder="Item 1&#10;Item 2" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar tarefa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
