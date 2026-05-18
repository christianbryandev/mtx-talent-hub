import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BILLING_MODELS, type Service } from "@/types/tasks";

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório").max(150),
  category: z.string().max(100).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  scope: z.string().max(3000).optional().or(z.literal("")),
  deliverables: z.string().max(3000).optional().or(z.literal("")),
  average_deadline: z.string().optional().or(z.literal("")),
  billing_model: z.string().optional().or(z.literal("")),
  default_value: z.string().optional().or(z.literal("")),
  status: z.string(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  service?: Service | null;
}

export function ServiceFormDialog({ open, onOpenChange, service }: Props) {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const defaults = useMemo<FormValues>(() => ({
    name: service?.name ?? "",
    category: service?.category ?? "",
    description: service?.description ?? "",
    scope: service?.scope ?? "",
    deliverables: service?.deliverables ?? "",
    average_deadline: service?.average_deadline?.toString() ?? "",
    billing_model: service?.billing_model ?? "",
    default_value: service?.default_value?.toString() ?? "",
    status: service?.status ?? "ativo",
  }), [service]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults, values: defaults });

  const mutation = useMutation({
    mutationFn: async (v: FormValues) => {
      setSubmitting(true);
      const payload = {
        name: v.name,
        category: v.category || null,
        description: v.description || null,
        scope: v.scope || null,
        deliverables: v.deliverables || null,
        average_deadline: v.average_deadline ? Number(v.average_deadline) : null,
        billing_model: v.billing_model || null,
        default_value: v.default_value ? Number(v.default_value) : null,
        status: v.status,
        is_active: v.status === "ativo",
      };
      if (service) {
        const { error } = await supabase.from("services").update(payload as never).eq("id", service.id);
        if (error) throw error;
        return service.id;
      } else {
        const { data, error } = await supabase.from("services").insert(payload as never).select("id").single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onSuccess: () => {
      toast.success(service ? "Serviço atualizado" : "Serviço criado");
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["service", service?.id] });
      onOpenChange(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setSubmitting(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? "Editar serviço" : "Novo serviço"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <Label>Categoria</Label>
              <Input {...form.register("category")} placeholder="Marketing, Design..." />
            </div>
            <div>
              <Label>Modelo de cobrança</Label>
              <Select
                value={form.watch("billing_model") || "_none"}
                onValueChange={(v) => form.setValue("billing_model", v === "_none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Nenhum —</SelectItem>
                  {BILLING_MODELS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo médio (dias)</Label>
              <Input type="number" {...form.register("average_deadline")} />
            </div>
            <div>
              <Label>Valor padrão (R$)</Label>
              <Input type="number" step="0.01" {...form.register("default_value")} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea rows={2} {...form.register("description")} />
            </div>
            <div className="md:col-span-2">
              <Label>Escopo</Label>
              <Textarea rows={3} {...form.register("scope")} />
            </div>
            <div className="md:col-span-2">
              <Label>Entregáveis</Label>
              <Textarea rows={3} {...form.register("deliverables")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {service ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
