import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { FUNNEL_STAGES, LEAD_ORIGIN_OPTIONS, type FunnelStage } from "@/types/crm";
import { ServiceMultiSelect } from "./ServiceMultiSelect";
import { ProfileSearchSelect } from "@/components/shared/RelationalSelects";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  company_name: z.string().min(2, "Empresa obrigatória").max(200),
  contact_name: z.string().max(150).optional().or(z.literal("")),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  whatsapp: z.string().max(30).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  niche: z.string().max(100).optional().or(z.literal("")),
  main_pain: z.string().max(2000).optional().or(z.literal("")),
  suggested_solution: z.string().max(2000).optional().or(z.literal("")),
  closing_probability: z.string().optional().or(z.literal("")),
  funnel_stage: z.string(),
  priority: z.string(),
  temperature: z.string().optional().or(z.literal("")),
  is_icp: z.boolean().optional(),
  segment_validated: z.boolean().optional(),
  commercial_responsible: z.string().optional().or(z.literal("")),
  lead_origin: z.string().max(100).optional().or(z.literal("")),
  next_followup_date: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStage?: FunnelStage;
  onCreated?: (id: string) => void;
}

export function OpportunityFormDialog({ open, onOpenChange, defaultStage, onCreated }: Props) {
  const qc = useQueryClient();
  const { isComercial, isAdmin } = usePermissions();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [calculatedSum, setCalculatedSum] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: "",
      funnel_stage: defaultStage ?? "prospeccao",
      priority: "media",
      commercial_responsible: isComercial && !isAdmin && user ? user.id : "",
    },
  });




  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      setSubmitting(true);
      const payload: Record<string, unknown> = {
        company_name: values.company_name,
        contact_name: values.contact_name || null,
        email: values.email || null,
        phone: values.phone || null,
        whatsapp: values.whatsapp || null,
        city: values.city || null,
        niche: values.niche || null,
        main_pain: values.main_pain || null,
        suggested_solution: values.suggested_solution || null,
        estimated_value: calculatedSum > 0 ? calculatedSum : null,
        closing_probability: values.closing_probability ? Number(values.closing_probability) : null,
        funnel_stage: values.funnel_stage,
        priority: values.priority,
        temperature: values.temperature || null,
        is_icp: values.is_icp ?? null,
        segment_validated: values.segment_validated ?? null,
        commercial_responsible: values.commercial_responsible || null,
        lead_origin: values.lead_origin || null,
        next_followup_date: values.next_followup_date || null,
        notes: values.notes || null,
      };
      const { data, error } = await supabase
        .from("opportunities")
        .insert(payload as never)
        .select("id")
        .single();
      if (error) throw error;

      if (serviceIds.length > 0) {
        const { error: svcErr } = await supabase
          .from("opportunity_services")
          .insert(
            serviceIds.map((sid) => ({
              opportunity_id: data.id as string,
              service_id: sid,
            })) as never,
          );
        if (svcErr) throw svcErr;
      }

      await supabase.from("activity_logs").insert({
        action: "opportunity_created",
        entity_type: "opportunity",
        entity_id: data.id,
        description: `Oportunidade "${values.company_name}" criada`,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      } as never);

      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Oportunidade criada");
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      form.reset();
      setServiceIds([]);
      setCalculatedSum(0);
      onOpenChange(false);
      onCreated?.(id);
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setSubmitting(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova oportunidade</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Empresa *</Label>
              <Input {...form.register("company_name")} />
              {form.formState.errors.company_name && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.company_name.message}
                </p>
              )}
            </div>
            <div>
              <Label>Contato</Label>
              <Input {...form.register("contact_name")} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input {...form.register("city")} />
            </div>
            <div>
              <Label>Segmento</Label>
              <Input {...form.register("niche")} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" {...form.register("email")} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input {...form.register("phone")} />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input {...form.register("whatsapp")} />
            </div>
            <div>
              <Label>Origem do lead</Label>
              <Select
                value={form.watch("lead_origin") || ""}
                onValueChange={(v) => form.setValue("lead_origin", v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {LEAD_ORIGIN_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Temperatura</Label>
              <Select
                value={form.watch("temperature") || ""}
                onValueChange={(v) => form.setValue("temperature", v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="frio">🔵 Frio</SelectItem>
                  <SelectItem value="morno">🟡 Morno</SelectItem>
                  <SelectItem value="quente">🔴 Quente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-4 items-center text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.watch("is_icp") ?? false}
                  onChange={(e) => form.setValue("is_icp", e.target.checked)}
                />
                ICP (Ideal Customer Profile)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.watch("segment_validated") ?? false}
                  onChange={(e) => form.setValue("segment_validated", e.target.checked)}
                />
                Segmento validado
              </label>
            </div>
            <div className="md:col-span-2">
              <Label>Dor principal</Label>
              <Textarea rows={2} {...form.register("main_pain")} />
            </div>
            <div className="md:col-span-2">
              <Label>Solução sugerida</Label>
              <Textarea rows={2} {...form.register("suggested_solution")} />
            </div>
            <div className="md:col-span-2">
              <Label>Serviços ofertados</Label>
              <ServiceMultiSelect 
                value={serviceIds} 
                onChange={(ids, sum) => {
                  setServiceIds(ids);
                  setCalculatedSum(sum || 0);
                }} 
              />
            </div>
            <div>
              <Label>Valor estimado (R$) - Automático</Label>
              <Input 
                type="text"
                disabled
                className="bg-muted text-muted-foreground font-semibold"
                value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculatedSum)}
              />
            </div>
            <div>
              <Label>Probabilidade (%)</Label>
              <Input type="number" min={0} max={100} {...form.register("closing_probability")} />
            </div>
            <div>
              <Label>Próximo follow-up</Label>
              <Input type="date" {...form.register("next_followup_date")} />
            </div>
            <div>
              <Label>Etapa do funil</Label>
              <Select
                value={form.watch("funnel_stage")}
                onValueChange={(v) => form.setValue("funnel_stage", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUNNEL_STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(v) => form.setValue("priority", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Responsável comercial</Label>
              <ProfileSearchSelect
                roleFilter="comercial"
                value={form.watch("commercial_responsible") || null}
                onChange={(v) => form.setValue("commercial_responsible", v ?? "")}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Notas</Label>
              <Textarea rows={2} {...form.register("notes")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar oportunidade
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
