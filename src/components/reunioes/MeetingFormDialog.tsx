import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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

const schema = z.object({
  title: z.string().min(2, "Informe um título"),
  type: z.enum([
    "geral_jovens",
    "mentoria",
    "operacional",
    "comercial",
    "alinhamento_entrega",
  ]),
  date: z.string().min(1, "Informe a data"),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().optional(),
  agenda: z.string().optional(),
  objectives: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting?: Meeting | null;
}

export function MeetingFormDialog({ open, onOpenChange, meeting }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!meeting;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      type: "operacional" as MeetingType,
      date: new Date().toISOString().slice(0, 10),
      start_time: "",
      end_time: "",
      location: "",
      is_recurring: false,
      recurrence_rule: "",
      agenda: "",
      objectives: "",
    },
  });

  useEffect(() => {
    if (open) {
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
            }
          : {
              title: "",
              type: "operacional",
              date: new Date().toISOString().slice(0, 10),
              start_time: "",
              end_time: "",
              location: "",
              is_recurring: false,
              recurrence_rule: "",
              agenda: "",
              objectives: "",
            },
      );
    }
  }, [open, meeting, form]);

  const isRecurring = form.watch("is_recurring");

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
      };

      if (isEdit && meeting) {
        const { error } = await supabase
          .from("meetings")
          .update(payload)
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
        return meeting.id;
      }
      const { data, error } = await supabase
        .from("meetings")
        .insert(payload)
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
      return data!.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
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
            Configure os detalhes, pauta e responsáveis da reunião.
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
              <Label>Tipo *</Label>
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
            <Label htmlFor="agenda">Pauta (resumo)</Label>
            <Textarea
              id="agenda"
              rows={3}
              placeholder="Você pode adicionar itens detalhados depois"
              {...form.register("agenda")}
            />
          </div>

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
