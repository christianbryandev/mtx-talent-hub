import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, ListPlus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  MEETING_TYPE_LABELS,
  MEETING_TYPE_LIST,
  RECURRENCE_OPTIONS,
  type Meeting,
  type MeetingType,
} from "@/types/meetings";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { MultiYoungSearchSelect } from "@/components/shared/MultiYoungSearchSelect";

const schema = z.object({
  title: z.string().min(2, "Informe um título"),
  type: z.enum([
    "formacao_mentoria",
    "checkin_operacional",
    "comercial_cliente",
    "gestao_mtx",
  ]),
  date: z.string().min(1, "Informe a data"),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().optional(),
  is_recurring: z.boolean(),
  recurrence_rule: z.string().optional(),
  agenda: z.string().optional(),
  objectives: z.string().optional(),
  link_kind: z.enum(["none", "opportunity", "client"]),
  link_opportunity_id: z.string().optional(),
  link_client_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting?: Meeting | null;
}

async function syncParticipants(meetingId: string, youngIds: string[]) {
  const { data: existing } = await supabase
    .from("meeting_participants")
    .select("id, young_id")
    .eq("meeting_id", meetingId)
    .not("young_id", "is", null);
  const existingRows = (existing ?? []) as { id: string; young_id: string }[];
  const existingIds = new Set(existingRows.map((r) => r.young_id));
  const toAdd = youngIds.filter((id) => !existingIds.has(id));
  const toRemove = existingRows.filter((r) => !youngIds.includes(r.young_id));
  if (toAdd.length) {
    await supabase
      .from("meeting_participants")
      .insert(toAdd.map((young_id) => ({ meeting_id: meetingId, young_id })) as never);
  }
  if (toRemove.length) {
    await supabase
      .from("meeting_participants")
      .delete()
      .in(
        "id",
        toRemove.map((r) => r.id),
      );
  }
}

export function MeetingFormDialog({ open, onOpenChange, meeting }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const isEdit = !!meeting;
  const [youngIds, setYoungIds] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      type: "checkin_operacional" as MeetingType,
      date: new Date().toISOString().slice(0, 10),
      start_time: "",
      end_time: "",
      location: "",
      is_recurring: false,
      recurrence_rule: "",
      agenda: "",
      objectives: "",
      link_kind: "none",
      link_opportunity_id: "",
      link_client_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      const linkKind: "none" | "opportunity" | "client" = meeting?.link_opportunity_id
        ? "opportunity"
        : meeting?.link_client_id
          ? "client"
          : "none";
      form.reset(
        meeting
          ? {
              title: meeting.title,
              type: meeting.type,
              date: meeting.date,
              start_time: meeting.start_time ?? "",
              end_time: meeting.end_time ?? "",
              location: meeting.location ?? "",
              is_recurring: meeting.is_recurring ?? false,
              recurrence_rule: meeting.recurrence_rule ?? "",
              agenda: meeting.agenda ?? "",
              objectives: meeting.objectives ?? "",
              link_kind: linkKind,
              link_opportunity_id: meeting.link_opportunity_id ?? "",
              link_client_id: meeting.link_client_id ?? "",
            }
          : {
              title: "",
              type: "checkin_operacional",
              date: new Date().toISOString().slice(0, 10),
              start_time: "",
              end_time: "",
              location: "",
              is_recurring: false,
              recurrence_rule: "",
              agenda: "",
              objectives: "",
              link_kind: "none",
              link_opportunity_id: "",
              link_client_id: "",
            },
      );
      // carrega jovens já vinculados (apenas em edição)
      if (meeting?.id) {
        supabase
          .from("meeting_participants")
          .select("young_id")
          .eq("meeting_id", meeting.id)
          .then(({ data }) => {
            setYoungIds(
              ((data ?? []) as { young_id: string | null }[])
                .map((r) => r.young_id)
                .filter(Boolean) as string[],
            );
          });
      } else {
        setYoungIds([]);
      }
    }
  }, [open, meeting, form]);

  const isRecurring = form.watch("is_recurring");
  const linkKind = form.watch("link_kind");

  const { data: opportunities = [] } = useQuery({
    queryKey: ["opps-min"],
    enabled: linkKind === "opportunity",
    queryFn: async () => {
      const { data } = await supabase
        .from("opportunities")
        .select("id, company_name")
        .eq("status", "aberta")
        .order("company_name");
      return data ?? [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-min-meeting"],
    enabled: linkKind === "client",
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, company_name")
        .order("company_name");
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        title: values.title,
        type: values.type,
        date: values.date,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
        location: values.location || null,
        is_recurring: values.is_recurring,
        recurrence_rule: values.is_recurring ? values.recurrence_rule || null : null,
        agenda: values.agenda || null,
        objectives: values.objectives || null,
        link_opportunity_id:
          values.link_kind === "opportunity" ? values.link_opportunity_id || null : null,
        link_client_id:
          values.link_kind === "client" ? values.link_client_id || null : null,
        // Não-admins só podem criar reuniões pessoais
        ...(isEdit ? {} : {
          created_by: user?.id ?? null,
          is_personal: !isAdmin,
        }),
      };

      if (isEdit && meeting) {
        const { error } = await supabase
          .from("meetings")
          .update(payload as never)
          .eq("id", meeting.id);
        if (error) throw error;
        if (user) {
          await supabase.from("activity_logs").insert({
            user_id: user.id,
            action: "meeting_updated",
            entity_type: "meeting",
            entity_id: meeting.id,
            description: `Reunião "${values.title}" atualizada`,
          });
        }
        await syncParticipants(meeting.id, youngIds);
        return meeting.id;
      }
      const { data, error } = await supabase
        .from("meetings")
        .insert(payload as never)
        .select("id")
        .single();
      if (error) throw error;
      if (user && data) {
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "meeting_created",
          entity_type: "meeting",
          entity_id: data.id,
          description: `Reunião "${values.title}" criada`,
        });
      }
      if (data) await syncParticipants(data.id, youngIds);
      return data!.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meeting-participants"] });
      toast.success(isEdit ? "Reunião atualizada" : "Reunião criada");
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast.error("Erro ao salvar", { description: e.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar reunião" : "Nova reunião"}</DialogTitle>
          <DialogDescription>
            Configure os detalhes, pauta e vínculos da reunião.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(v) => form.setValue("type", v as MeetingType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_TYPE_LIST.map((t) => (
                    <SelectItem key={t} value={t}>
                      {MEETING_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input id="date" type="date" {...form.register("date")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="start_time">Início</Label>
              <Input id="start_time" type="time" {...form.register("start_time")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Fim</Label>
              <Input id="end_time" type="time" {...form.register("end_time")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Local / Link</Label>
              <Input id="location" {...form.register("location")} placeholder="Sala 2 ou URL" />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-3">
            <Label>Vincular a</Label>
            <Select
              value={linkKind}
              onValueChange={(v) =>
                form.setValue("link_kind", v as "none" | "opportunity" | "client")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem vínculo</SelectItem>
                <SelectItem value="opportunity">Oportunidade (CRM)</SelectItem>
                <SelectItem value="client">Cliente ativo</SelectItem>
              </SelectContent>
            </Select>
            {linkKind === "opportunity" && (
              <Select
                value={form.watch("link_opportunity_id") ?? ""}
                onValueChange={(v) => form.setValue("link_opportunity_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a oportunidade" />
                </SelectTrigger>
                <SelectContent>
                  {opportunities.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {linkKind === "client" && (
              <Select
                value={form.watch("link_client_id") ?? ""}
                onValueChange={(v) => form.setValue("link_client_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-3">
            <div>
              <Label htmlFor="is_recurring" className="cursor-pointer">
                Reunião recorrente
              </Label>
              <p className="text-xs text-muted-foreground">
                Marque para configurar frequência
              </p>
            </div>
            <Switch
              id="is_recurring"
              checked={isRecurring}
              onCheckedChange={(v) => form.setValue("is_recurring", v)}
            />
          </div>

          {isRecurring && (
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={form.watch("recurrence_rule") ?? ""}
                onValueChange={(v) => form.setValue("recurrence_rule", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="objectives">Objetivos</Label>
            <Textarea id="objectives" rows={2} {...form.register("objectives")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda">Pauta prévia</Label>
            <Textarea
              id="agenda"
              rows={3}
              placeholder="O que será discutido (pode adicionar itens detalhados depois)"
              {...form.register("agenda")}
            />
          </div>

          <div className="space-y-2">
            <Label>Jovens participantes</Label>
            <MultiYoungSearchSelect
              value={youngIds}
              onChange={setYoungIds}
              placeholder="Atribuir jovens à reunião"
            />
            <p className="text-[11px] text-muted-foreground">
              Os jovens selecionados poderão visualizar a reunião e a lista de participantes.
            </p>
          </div>

          {isEdit && meeting && <ActionItemsSection meetingId={meeting.id} />}


          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ActionItem {
  id: string;
  description: string;
  responsible_id: string | null;
  task_id: string | null;
  position: number;
}

function ActionItemsSection({ meetingId }: { meetingId: string }) {
  const qc = useQueryClient();
  const [newDesc, setNewDesc] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["meeting-action-items", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_action_items")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("position");
      if (error) throw error;
      return (data ?? []) as ActionItem[];
    },
  });

  const addItem = useMutation({
    mutationFn: async (description: string) => {
      const { error } = await supabase
        .from("meeting_action_items")
        .insert({ meeting_id: meetingId, description, position: items.length } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewDesc("");
      qc.invalidateQueries({ queryKey: ["meeting-action-items", meetingId] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meeting_action_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting-action-items", meetingId] }),
  });

  const convertToTask = useMutation({
    mutationFn: async (item: ActionItem) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          title: item.description,
          description: `Gerado a partir de reunião`,
          status: "aberta",
          kanban_column: "a_fazer",
          priority: "media",
          supervisor_id: item.responsible_id,
          created_by: userId ?? null,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      await supabase
        .from("meeting_action_items")
        .update({ task_id: (task as { id: string }).id } as never)
        .eq("id", item.id);
    },
    onSuccess: () => {
      toast.success("Tarefa criada a partir do próximo passo");
      qc.invalidateQueries({ queryKey: ["meeting-action-items", meetingId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-3">
      <Label>Próximos passos / decisões</Label>
      <div className="flex gap-2">
        <Input
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Descreva o próximo passo"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (newDesc.trim()) addItem.mutate(newDesc.trim());
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          onClick={() => newDesc.trim() && addItem.mutate(newDesc.trim())}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2 rounded border border-border/40 bg-background/40 p-2 text-sm">
            <span className="flex-1">{it.description}</span>
            {it.task_id ? (
              <span className="text-xs text-muted-foreground">✓ Tarefa criada</span>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => convertToTask.mutate(it)}
                disabled={convertToTask.isPending}
              >
                <ListPlus className="h-3 w-3 mr-1" /> Virar tarefa
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => removeItem.mutate(it.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-xs text-muted-foreground">Nenhum próximo passo registrado ainda.</li>
        )}
      </ul>
    </div>
  );
}
