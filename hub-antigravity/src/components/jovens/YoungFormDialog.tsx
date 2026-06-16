import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  YOUNG_STATUS_LIST,
  TRAIL_PHASE_LIST,
  YOUNG_STATUS_LABELS,
  TRAIL_PHASE_LABELS,
  INTEREST_AREAS,
  type YoungStatus,
  type TrailPhase,
} from "@/types";

const STEPS = ["Dados Pessoais", "Família e Contexto", "Perfil e Vocação", "Dados do Projeto"] as const;

interface FormState {
  full_name: string;
  birth_date: string;
  cpf: string;
  rg: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  mother_name: string;
  father_name: string;
  legal_guardian: string;
  guardian_contact: string;
  education_level: string;
  school: string;
  current_situation: string;
  family_income: string;
  people_at_home: string;
  social_context: string;
  testimony: string;
  dreams: string;
  skills: string;
  interest_area: string;
  vocation_area: string;
  availability: string;
  has_laptop: boolean;
  has_phone: boolean;
  has_internet: boolean;
  has_professional_chip: boolean;
  status: YoungStatus;
  trail_phase: TrailPhase | "";
  entry_date: string;
  mentor_id: string;
  observations: string;
  has_cnpj: boolean;
  cnpj_type: string;
  cnpj_opening_date: string;
  pix_key: string;
  bank_name: string;
  bank_agency: string;
  bank_account: string;
}

const EMPTY: FormState = {
  full_name: "",
  birth_date: "",
  cpf: "",
  rg: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  mother_name: "",
  father_name: "",
  legal_guardian: "",
  guardian_contact: "",
  education_level: "",
  school: "",
  current_situation: "",
  family_income: "",
  people_at_home: "",
  social_context: "",
  testimony: "",
  dreams: "",
  skills: "",
  interest_area: "",
  vocation_area: "",
  availability: "",
  has_laptop: false,
  has_phone: false,
  has_internet: false,
  has_professional_chip: false,
  status: "inscrito",
  trail_phase: "",
  entry_date: "",
  mentor_id: "",
  observations: "",
  has_cnpj: false,
  cnpj_type: "",
  cnpj_opening_date: "",
  pix_key: "",
  bank_name: "",
  bank_agency: "",
  bank_account: "",
};

export function YoungFormDialog({
  open,
  onOpenChange,
  initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<FormState> & { id?: string };
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({ ...EMPTY, ...initialData });
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: mentors = [] } = useQuery({
    queryKey: ["mentors"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const reset = () => {
    setStep(0);
    setForm({ ...EMPTY, ...initialData });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Nome é obrigatório");
      const payload = {
        full_name: form.full_name.trim(),
        birth_date: form.birth_date || null,
        cpf: form.cpf || null,
        rg: form.rg || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        zip_code: form.zip_code || null,
        mother_name: form.mother_name || null,
        father_name: form.father_name || null,
        legal_guardian: form.legal_guardian || null,
        guardian_contact: form.guardian_contact || null,
        education_level: form.education_level || null,
        school: form.school || null,
        current_situation: form.current_situation || null,
        family_income: form.family_income || null,
        people_at_home: form.people_at_home ? Number(form.people_at_home) : null,
        social_context: form.social_context || null,
        testimony: form.testimony || null,
        dreams: form.dreams || null,
        skills: form.skills || null,
        interest_area: form.interest_area || null,
        vocation_area: form.vocation_area || null,
        availability: form.availability || null,
        has_laptop: form.has_laptop,
        has_phone: form.has_phone,
        has_internet: form.has_internet,
        has_professional_chip: form.has_professional_chip,
        status: form.status,
        trail_phase: form.trail_phase || null,
        entry_date: form.entry_date || null,
        mentor_id: form.mentor_id || null,
        observations: form.observations || null,
        has_cnpj: form.has_cnpj,
        cnpj_type: form.cnpj_type || null,
        cnpj_opening_date: form.cnpj_opening_date || null,
        pix_key: form.pix_key || null,
        bank_name: form.bank_name || null,
        bank_agency: form.bank_agency || null,
        bank_account: form.bank_account || null,
      };

      const { data, error } = await supabase
        .from("young_people")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      // Registrar evolução inicial
      await supabase.from("young_evolution").insert({
        young_id: data.id,
        recorded_by: user?.id ?? null,
        type: "status_change",
        new_value: data.status,
        description: "Cadastro criado",
      });

      // Activity log
      await supabase.from("activity_logs").insert({
        user_id: user?.id ?? null,
        action: "young_created",
        entity_type: "young_people",
        entity_id: data.id,
        description: `Jovem cadastrado: ${data.full_name}`,
      });

      return data;
    },
    onSuccess: () => {
      toast.success("Jovem cadastrado com sucesso");
      qc.invalidateQueries({ queryKey: ["young_people"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Jovem</DialogTitle>
          <div className="flex items-center gap-2 pt-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`text-xs ${i === step ? "font-semibold" : "text-muted-foreground"}`}>
                  {s}
                </span>
                {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-4 py-2">
          {step === 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nome completo *</Label>
                <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
              </div>
              <div>
                <Label>Data de nascimento</Label>
                <Input type="date" value={form.birth_date} onChange={(e) => update("birth_date", e.target.value)} />
              </div>
              <div>
                <Label>CPF</Label>
                <Input value={form.cpf} onChange={(e) => update("cpf", e.target.value)} />
              </div>
              <div>
                <Label>RG</Label>
                <Input value={form.rg} onChange={(e) => update("rg", e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Endereço</Label>
                <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
              </div>
              <div>
                <Label>Estado</Label>
                <Input value={form.state} onChange={(e) => update("state", e.target.value)} maxLength={2} />
              </div>
              <div>
                <Label>CEP</Label>
                <Input value={form.zip_code} onChange={(e) => update("zip_code", e.target.value)} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Nome da mãe</Label>
                <Input value={form.mother_name} onChange={(e) => update("mother_name", e.target.value)} />
              </div>
              <div>
                <Label>Nome do pai</Label>
                <Input value={form.father_name} onChange={(e) => update("father_name", e.target.value)} />
              </div>
              <div>
                <Label>Responsável legal (se menor)</Label>
                <Input value={form.legal_guardian} onChange={(e) => update("legal_guardian", e.target.value)} />
              </div>
              <div>
                <Label>Contato do responsável</Label>
                <Input value={form.guardian_contact} onChange={(e) => update("guardian_contact", e.target.value)} />
              </div>
              <div>
                <Label>Escolaridade</Label>
                <Input value={form.education_level} onChange={(e) => update("education_level", e.target.value)} />
              </div>
              <div>
                <Label>Instituição de ensino</Label>
                <Input value={form.school} onChange={(e) => update("school", e.target.value)} />
              </div>
              <div>
                <Label>Situação atual</Label>
                <Select value={form.current_situation} onValueChange={(v) => update("current_situation", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estuda">Estuda</SelectItem>
                    <SelectItem value="trabalha">Trabalha</SelectItem>
                    <SelectItem value="estuda_trabalha">Estuda e trabalha</SelectItem>
                    <SelectItem value="desempregado">Desempregado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Renda familiar</Label>
                <Input value={form.family_income} onChange={(e) => update("family_income", e.target.value)} />
              </div>
              <div>
                <Label>Pessoas na casa</Label>
                <Input type="number" value={form.people_at_home} onChange={(e) => update("people_at_home", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Contexto social / vulnerabilidade</Label>
                <Textarea rows={3} value={form.social_context} onChange={(e) => update("social_context", e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Testemunho / história pessoal</Label>
                <Textarea rows={3} value={form.testimony} onChange={(e) => update("testimony", e.target.value)} />
              </div>
              <div>
                <Label>Sonhos e objetivos</Label>
                <Textarea rows={3} value={form.dreams} onChange={(e) => update("dreams", e.target.value)} />
              </div>
              <div>
                <Label>Habilidades percebidas</Label>
                <Textarea rows={2} value={form.skills} onChange={(e) => update("skills", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Área de interesse</Label>
                  <Select value={form.interest_area} onValueChange={(v) => update("interest_area", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {INTEREST_AREAS.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Área de vocação identificada</Label>
                  <Input value={form.vocation_area} onChange={(e) => update("vocation_area", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Disponibilidade de horário</Label>
                <Input value={form.availability} onChange={(e) => update("availability", e.target.value)} placeholder="Ex: manhãs, noites, finais de semana" />
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 sm:grid-cols-4">
                {[
                  ["has_laptop", "Laptop"],
                  ["has_phone", "Celular"],
                  ["has_internet", "Internet"],
                  ["has_professional_chip", "Chip profissional"],
                ].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form[k as keyof FormState] as boolean}
                      onCheckedChange={(c) => update(k as keyof FormState, !!c as never)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Status inicial</Label>
                <Select value={form.status} onValueChange={(v) => update("status", v as YoungStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YOUNG_STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s}>{YOUNG_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fase da trilha</Label>
                <Select value={form.trail_phase} onValueChange={(v) => update("trail_phase", v as TrailPhase)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TRAIL_PHASE_LIST.map((p) => (
                      <SelectItem key={p} value={p}>{TRAIL_PHASE_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de entrada</Label>
                <Input type="date" value={form.entry_date} onChange={(e) => update("entry_date", e.target.value)} />
              </div>
              <div>
                <Label>Mentor responsável</Label>
                <Select value={form.mentor_id} onValueChange={(v) => update("mentor_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {mentors.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name ?? m.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Observações iniciais</Label>
                <Textarea rows={2} value={form.observations} onChange={(e) => update("observations", e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Checkbox checked={form.has_cnpj} onCheckedChange={(c) => update("has_cnpj", !!c)} />
                Possui CNPJ
              </label>
              {form.has_cnpj && (
                <>
                  <div>
                    <Label>Tipo de CNPJ</Label>
                    <Input value={form.cnpj_type} onChange={(e) => update("cnpj_type", e.target.value)} placeholder="MEI, ME..." />
                  </div>
                  <div>
                    <Label>Data de abertura</Label>
                    <Input type="date" value={form.cnpj_opening_date} onChange={(e) => update("cnpj_opening_date", e.target.value)} />
                  </div>
                </>
              )}
              <div>
                <Label>Chave Pix</Label>
                <Input value={form.pix_key} onChange={(e) => update("pix_key", e.target.value)} />
              </div>
              <div>
                <Label>Banco</Label>
                <Input value={form.bank_name} onChange={(e) => update("bank_name", e.target.value)} />
              </div>
              <div>
                <Label>Agência</Label>
                <Input value={form.bank_agency} onChange={(e) => update("bank_agency", e.target.value)} />
              </div>
              <div>
                <Label>Conta</Label>
                <Input value={form.bank_account} onChange={(e) => update("bank_account", e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex sm:justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Próximo <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar cadastro"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
