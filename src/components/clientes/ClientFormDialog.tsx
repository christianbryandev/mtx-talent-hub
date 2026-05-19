import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import {
  ProfileSearchSelect,
} from "@/components/shared/RelationalSelects";
import { YoungSearchSelect } from "@/components/shared/YoungSearchSelect";
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_LIST,
  COMPANY_SIZES,
} from "@/types/clients";

const schema = z.object({
  // Etapa 1
  company_name: z.string().min(2, "Razão social obrigatória").max(200),
  trade_name: z.string().max(200).optional().or(z.literal("")),
  cnpj: z.string().max(20).optional().or(z.literal("")),
  segment: z.string().max(100).optional().or(z.literal("")),
  niche: z.string().max(100).optional().or(z.literal("")),
  company_size: z.string().optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
  instagram: z.string().max(100).optional().or(z.literal("")),
  facebook: z.string().max(100).optional().or(z.literal("")),
  linkedin: z.string().max(100).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(50).optional().or(z.literal("")),
  // Etapa 2
  contact_name: z.string().max(150).optional().or(z.literal("")),
  contact_role: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  whatsapp: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  lead_origin: z.string().max(100).optional().or(z.literal("")),
  commercial_responsible: z.string().optional().or(z.literal("")),
  // Etapa 3
  status: z.string(),
  active_contract: z.boolean(),
  contract_start: z.string().optional().or(z.literal("")),
  contract_end: z.string().optional().or(z.literal("")),
  monthly_value: z.string().optional().or(z.literal("")),
  setup_value: z.string().optional().or(z.literal("")),
  young_responsible: z.string().optional().or(z.literal("")),
  observations: z.string().max(2000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}

export function ClientFormDialog({ open, onOpenChange, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const qc = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: "",
      status: "lead",
      active_contract: false,
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-commercial"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: youngs = [] } = useQuery({
    queryKey: ["young-list-min"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("young_people")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, unknown> = {
        company_name: values.company_name,
        trade_name: values.trade_name || null,
        cnpj: values.cnpj || null,
        segment: values.segment || null,
        niche: values.niche || null,
        company_size: values.company_size || null,
        website: values.website || null,
        instagram: values.instagram || null,
        facebook: values.facebook || null,
        linkedin: values.linkedin || null,
        address: values.address || null,
        city: values.city || null,
        state: values.state || null,
        contact_name: values.contact_name || null,
        contact_role: values.contact_role || null,
        phone: values.phone || null,
        whatsapp: values.whatsapp || null,
        email: values.email || null,
        lead_origin: values.lead_origin || null,
        commercial_responsible: values.commercial_responsible || null,
        status: values.status,
        active_contract: values.active_contract,
        contract_start: values.contract_start || null,
        contract_end: values.contract_end || null,
        monthly_value: values.monthly_value ? Number(values.monthly_value) : null,
        setup_value: values.setup_value ? Number(values.setup_value) : null,
        young_responsible: values.young_responsible || null,
        observations: values.observations || null,
        entry_date: new Date().toISOString().slice(0, 10),
      };

      const { data, error } = await supabase
        .from("clients")
        .insert(payload as never)
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        action: "client_created",
        entity_type: "client",
        entity_id: data.id,
        description: `Cliente "${values.company_name}" criado`,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      } as never);

      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Cliente criado com sucesso");
      qc.invalidateQueries({ queryKey: ["clients"] });
      onOpenChange(false);
      form.reset();
      setStep(1);
      onCreated?.(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const next = async () => {
    const fields: (keyof FormValues)[] =
      step === 1 ? ["company_name"] : step === 2 ? [] : [];
    const ok = await form.trigger(fields);
    if (ok) setStep((s) => Math.min(3, s + 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo cliente — Etapa {step} de 3</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4"
        >
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Razão social *</Label>
                <Input {...form.register("company_name")} />
                {form.formState.errors.company_name && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.company_name.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Nome fantasia</Label>
                <Input {...form.register("trade_name")} />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input {...form.register("cnpj")} />
              </div>
              <div>
                <Label>Segmento</Label>
                <Input {...form.register("segment")} />
              </div>
              <div>
                <Label>Nicho</Label>
                <Input {...form.register("niche")} />
              </div>
              <div>
                <Label>Porte</Label>
                <Select
                  onValueChange={(v) => form.setValue("company_size", v)}
                  value={form.watch("company_size") || ""}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Website</Label>
                <Input {...form.register("website")} />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input {...form.register("instagram")} />
              </div>
              <div>
                <Label>Facebook</Label>
                <Input {...form.register("facebook")} />
              </div>
              <div>
                <Label>LinkedIn</Label>
                <Input {...form.register("linkedin")} />
              </div>
              <div className="md:col-span-2">
                <Label>Endereço</Label>
                <Input {...form.register("address")} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input {...form.register("city")} />
              </div>
              <div>
                <Label>Estado</Label>
                <Input {...form.register("state")} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nome do responsável</Label>
                <Input {...form.register("contact_name")} />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input {...form.register("contact_role")} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input {...form.register("phone")} />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input {...form.register("whatsapp")} />
              </div>
              <div className="md:col-span-2">
                <Label>E-mail</Label>
                <Input type="email" {...form.register("email")} />
              </div>
              <div>
                <Label>Origem do lead</Label>
                <Input {...form.register("lead_origin")} />
              </div>
              <div>
                <Label>Responsável comercial</Label>
                <ProfileSearchSelect
                  value={form.watch("commercial_responsible") || null}
                  onChange={(v) => form.setValue("commercial_responsible", v ?? "")}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Status inicial</Label>
                <Select
                  onValueChange={(v) => form.setValue("status", v)}
                  value={form.watch("status")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLIENT_STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s}>
                        {CLIENT_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.watch("active_contract")}
                    onCheckedChange={(v) => form.setValue("active_contract", v)}
                  />
                  <Label>Contrato ativo</Label>
                </div>
              </div>
              <div>
                <Label>Início do contrato</Label>
                <Input type="date" {...form.register("contract_start")} />
              </div>
              <div>
                <Label>Término do contrato</Label>
                <Input type="date" {...form.register("contract_end")} />
              </div>
              <div>
                <Label>Valor mensal (R$)</Label>
                <Input type="number" step="0.01" {...form.register("monthly_value")} />
              </div>
              <div>
                <Label>Valor de setup (R$)</Label>
                <Input type="number" step="0.01" {...form.register("setup_value")} />
              </div>
              <div className="md:col-span-2">
                <Label>Jovem responsável</Label>
                <Select
                  onValueChange={(v) =>
                    form.setValue("young_responsible", v === "_none" ? "" : v)
                  }
                  value={form.watch("young_responsible") || "_none"}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Nenhum —</SelectItem>
                    {youngs.map((y) => (
                      <SelectItem key={y.id} value={y.id}>{y.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Observações</Label>
                <Textarea rows={3} {...form.register("observations")} />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                Voltar
              </Button>
            )}
            {step < 3 && (
              <Button type="button" onClick={next}>
                Avançar
              </Button>
            )}
            {step === 3 && (
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar cliente
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
