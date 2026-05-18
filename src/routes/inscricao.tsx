import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { INTEREST_AREAS, HOW_FOUND_OPTIONS } from "@/types";

export const Route = createFileRoute("/inscricao")({
  head: () => ({
    meta: [
      { title: "Inscrição — MTX Multiplicando Talentos" },
      { name: "description", content: "Cadastre-se na MTX e comece sua trilha de transformação." },
    ],
  }),
  component: PublicApplicationPage,
});

const STEPS = ["Quem é você", "Sua situação", "Sua história", "Seus recursos", "Confirmação"];

interface F {
  full_name: string;
  age: string;
  birth_date: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  education_level: string;
  currently_studying: string;
  currently_working: string;
  family_income: string;
  people_at_home: string;
  personal_story: string;
  dreams: string;
  why_mtx: string;
  perceived_skills: string;
  has_laptop: string;
  has_phone: string;
  has_internet: string;
  interest_area: string;
  how_found_mtx: string;
  data_authorization: boolean;
  guardian_authorization: boolean;
}

const EMPTY: F = {
  full_name: "",
  age: "",
  birth_date: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  city: "",
  state: "",
  education_level: "",
  currently_studying: "",
  currently_working: "",
  family_income: "",
  people_at_home: "",
  personal_story: "",
  dreams: "",
  why_mtx: "",
  perceived_skills: "",
  has_laptop: "",
  has_phone: "",
  has_internet: "",
  interest_area: "",
  how_found_mtx: "",
  data_authorization: false,
  guardian_authorization: false,
};

function PublicApplicationPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<F>(EMPTY);
  const [done, setDone] = useState(false);

  const u = <K extends keyof F>(k: K, v: F[K]) => setForm((f) => ({ ...f, [k]: v }));
  const minor = form.age && Number(form.age) < 18;

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Informe seu nome completo");
      if (!form.data_authorization) throw new Error("Você precisa autorizar o uso de dados");
      if (minor && !form.guardian_authorization)
        throw new Error("Autorização do responsável é obrigatória para menores de 18 anos");

      const { error } = await supabase.from("young_applications").insert({
        full_name: form.full_name.trim(),
        age: form.age ? Number(form.age) : null,
        birth_date: form.birth_date || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        education_level: form.education_level || null,
        currently_studying: form.currently_studying === "sim" ? true : form.currently_studying === "nao" ? false : null,
        currently_working: form.currently_working === "sim" ? true : form.currently_working === "nao" ? false : null,
        family_income: form.family_income || null,
        personal_story: form.personal_story || null,
        dreams: form.dreams || null,
        why_mtx: form.why_mtx || null,
        perceived_skills: form.perceived_skills || null,
        has_laptop: form.has_laptop === "sim" ? true : form.has_laptop === "nao" ? false : null,
        has_phone: form.has_phone === "sim" ? true : form.has_phone === "nao" ? false : null,
        has_internet: form.has_internet === "sim" ? true : form.has_internet === "nao" ? false : null,
        interest_area: form.interest_area || null,
        how_found_mtx: form.how_found_mtx || null,
        data_authorization: form.data_authorization,
        guardian_authorization: minor ? form.guardian_authorization : null,
        status: "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => toast.error(e.message),
  });

  if (done) {
    return (
      <div className="min-h-screen bg-background grid place-items-center px-4 py-10">
        <Card className="max-w-lg w-full p-10 text-center space-y-4">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Inscrição enviada!</h1>
          <p className="text-muted-foreground">
            Obrigado por se inscrever na MTX. Recebemos sua candidatura e entraremos em contato em breve.
            Sua história importa — e o próximo capítulo começa agora.
          </p>
          <p className="text-sm text-muted-foreground">— Equipe MTX • Multiplicando Talentos</p>
        </Card>
      </div>
    );
  }

  const yesNo = (key: keyof F, label: string) => (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <RadioGroup
        value={form[key] as string}
        onValueChange={(v) => u(key, v as F[typeof key])}
        className="flex gap-4"
      >
        <label className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="sim" /> Sim
        </label>
        <label className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="nao" /> Não
        </label>
      </RadioGroup>
    </div>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-lg font-bold">MTX • Multiplicando Talentos</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Formulário de inscrição</div>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-1">
              <div
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 ${i < step ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold">{STEPS[step]}</h2>

          {step === 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nome completo *</Label>
                <Input value={form.full_name} onChange={(e) => u("full_name", e.target.value)} />
              </div>
              <div>
                <Label>Idade</Label>
                <Input type="number" value={form.age} onChange={(e) => u("age", e.target.value)} />
              </div>
              <div>
                <Label>Data de nascimento</Label>
                <Input type="date" value={form.birth_date} onChange={(e) => u("birth_date", e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => u("phone", e.target.value)} />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => u("whatsapp", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => u("email", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Endereço</Label>
                <Input value={form.address} onChange={(e) => u("address", e.target.value)} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(e) => u("city", e.target.value)} />
              </div>
              <div>
                <Label>Estado</Label>
                <Input value={form.state} onChange={(e) => u("state", e.target.value)} maxLength={2} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Escolaridade</Label>
                <Input value={form.education_level} onChange={(e) => u("education_level", e.target.value)} />
              </div>
              {yesNo("currently_studying", "Estuda atualmente?")}
              {yesNo("currently_working", "Trabalha atualmente?")}
              <div>
                <Label>Renda familiar</Label>
                <Input value={form.family_income} onChange={(e) => u("family_income", e.target.value)} placeholder="Ex: até R$ 2.000" />
              </div>
              <div>
                <Label>Pessoas que moram com você</Label>
                <Input type="number" value={form.people_at_home} onChange={(e) => u("people_at_home", e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Conte sua história</Label>
                <Textarea rows={4} value={form.personal_story} onChange={(e) => u("personal_story", e.target.value)} />
              </div>
              <div>
                <Label>Quais são seus sonhos?</Label>
                <Textarea rows={3} value={form.dreams} onChange={(e) => u("dreams", e.target.value)} />
              </div>
              <div>
                <Label>Por que deseja entrar na MTX?</Label>
                <Textarea rows={3} value={form.why_mtx} onChange={(e) => u("why_mtx", e.target.value)} />
              </div>
              <div>
                <Label>Quais habilidades você acredita ter?</Label>
                <Textarea rows={3} value={form.perceived_skills} onChange={(e) => u("perceived_skills", e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {yesNo("has_laptop", "Possui notebook?")}
              {yesNo("has_phone", "Possui celular?")}
              {yesNo("has_internet", "Possui acesso à internet?")}
              <div className="sm:col-span-2">
                <Label>Qual área mais te interessa?</Label>
                <Select value={form.interest_area} onValueChange={(v) => u("interest_area", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {INTEREST_AREAS.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Como você conheceu a MTX?</Label>
                <Select value={form.how_found_mtx} onValueChange={(v) => u("how_found_mtx", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {HOW_FOUND_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card/50 p-4 text-sm space-y-3">
                <p>Antes de enviar, confirme suas autorizações:</p>
                <label className="flex items-start gap-2">
                  <Checkbox
                    checked={form.data_authorization}
                    onCheckedChange={(c) => u("data_authorization", !!c)}
                    className="mt-0.5"
                  />
                  <span>Autorizo o uso dos meus dados pessoais pela MTX para fins de avaliação e contato relacionados a esta inscrição.</span>
                </label>
                {minor && (
                  <label className="flex items-start gap-2">
                    <Checkbox
                      checked={form.guardian_authorization}
                      onCheckedChange={(c) => u("guardian_authorization", !!c)}
                      className="mt-0.5"
                    />
                    <span>Confirmo que tenho autorização do meu responsável legal (sou menor de 18 anos).</span>
                  </label>
                )}
              </div>
              <div className="rounded-md bg-primary/10 p-3 text-sm">
                Revise seus dados nos passos anteriores antes de enviar.
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                Próximo <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
                {submit.isPending ? "Enviando..." : "Enviar inscrição"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
