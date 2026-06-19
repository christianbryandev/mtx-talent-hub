import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/briefing/$clientId")({
  head: () => ({ meta: [{ title: "Briefing — MTX" }] }),
  component: BriefingPage,
});

const schema = z.object({
  company_name: z.string().min(2, "Obrigatório").max(200),
  contact_name: z.string().min(2, "Obrigatório").max(150),
  segment: z.string().max(100).optional().or(z.literal("")),
  main_products: z.string().max(2000).optional().or(z.literal("")),
  target_audience: z.string().max(2000).optional().or(z.literal("")),
  main_pains: z.string().max(2000).optional().or(z.literal("")),
  biggest_challenge: z.string().max(2000).optional().or(z.literal("")),
  goals_with_mtx: z.string().max(2000).optional().or(z.literal("")),
  commercial_goals: z.string().max(2000).optional().or(z.literal("")),
  marketing_goals: z.string().max(2000).optional().or(z.literal("")),
  invests_in_marketing: z.boolean(),
  has_commercial_team: z.boolean(),
  uses_crm: z.boolean(),
  current_channels: z.string().max(2000).optional().or(z.literal("")),
  current_website: z.string().max(200).optional().or(z.literal("")),
  social_media: z.string().max(2000).optional().or(z.literal("")),
  competitors: z.string().max(2000).optional().or(z.literal("")),
  differentials: z.string().max(2000).optional().or(z.literal("")),
  communication_tone: z.string().max(500).optional().or(z.literal("")),
  existing_materials: z.string().max(2000).optional().or(z.literal("")),
  tools_access: z.string().max(2000).optional().or(z.literal("")),
  urgency: z.string().max(100).optional().or(z.literal("")),
  expected_deadline: z.string().max(100).optional().or(z.literal("")),
  estimated_budget: z.string().max(100).optional().or(z.literal("")),
  additional_notes: z.string().max(2000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

function BriefingPage() {
  const { clientId } = Route.useParams();
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const total = 5;

  const { data: client } = useQuery({
    queryKey: ["briefing-client", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("company_name, trade_name, contact_name")
        .eq("id", clientId)
        .maybeSingle();
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: "",
      contact_name: "",
      invests_in_marketing: false,
      has_commercial_team: false,
      uses_crm: false,
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        company_name: client.trade_name || client.company_name || "",
        contact_name: client.contact_name || "",
        invests_in_marketing: false,
        has_commercial_team: false,
        uses_crm: false,
      });
    }
  }, [client, form]);

  const submit = useMutation({
    mutationFn: async (v: FormValues) => {
      const { error } = await supabase.from("client_briefings").insert({
        client_id: clientId,
        ...v,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => toast.error(e.message),
  });

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-bold">Briefing enviado!</h1>
            <p className="text-muted-foreground">
              Obrigado por compartilhar essas informações com a MTX. Nosso time
              entrará em contato em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const next = async () => {
    const fieldsByStep: Record<number, (keyof FormValues)[]> = {
      1: ["company_name", "contact_name"],
      2: [],
      3: [],
      4: [],
      5: [],
    };
    const ok = await form.trigger(fieldsByStep[step]);
    if (ok) setStep((s) => Math.min(total, s + 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold">Briefing MTX</h1>
          <p className="text-muted-foreground">
            {client?.trade_name || client?.company_name
              ? `Olá, ${client.trade_name || client.company_name}! `
              : ""}
            Conte um pouco sobre sua empresa para começarmos.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Etapa {step} de {total}</span>
            <span>{Math.round((step / total) * 100)}%</span>
          </div>
          <Progress value={(step / total) * 100} />
        </div>

        <Card>
          <CardContent className="p-6">
            <form
              onSubmit={form.handleSubmit((v) => submit.mutate(v))}
              className="space-y-4"
            >
              {step === 1 && (
                <Section title="Sua empresa">
                  <Field label="Nome da empresa *">
                    <Input {...form.register("company_name")} />
                    {form.formState.errors.company_name && (
                      <Err msg={form.formState.errors.company_name.message} />
                    )}
                  </Field>
                  <Field label="Nome do responsável *">
                    <Input {...form.register("contact_name")} />
                    {form.formState.errors.contact_name && (
                      <Err msg={form.formState.errors.contact_name.message} />
                    )}
                  </Field>
                  <Field label="Segmento de atuação">
                    <Input {...form.register("segment")} />
                  </Field>
                  <Field label="Principais produtos ou serviços">
                    <Textarea rows={3} {...form.register("main_products")} />
                  </Field>
                  <Field label="Público-alvo">
                    <Textarea rows={3} {...form.register("target_audience")} />
                  </Field>
                </Section>
              )}

              {step === 2 && (
                <Section title="Dores e objetivos">
                  <Field label="Principais dores da empresa">
                    <Textarea rows={3} {...form.register("main_pains")} />
                  </Field>
                  <Field label="Maior desafio hoje">
                    <Textarea rows={3} {...form.register("biggest_challenge")} />
                  </Field>
                  <Field label="Objetivos com a MTX">
                    <Textarea rows={3} {...form.register("goals_with_mtx")} />
                  </Field>
                  <Field label="Metas comerciais">
                    <Textarea rows={2} {...form.register("commercial_goals")} />
                  </Field>
                  <Field label="Metas de marketing">
                    <Textarea rows={2} {...form.register("marketing_goals")} />
                  </Field>
                </Section>
              )}

              {step === 3 && (
                <Section title="Situação atual">
                  <SwitchField
                    label="Já investe em marketing?"
                    checked={form.watch("invests_in_marketing")}
                    onChange={(v) => form.setValue("invests_in_marketing", v)}
                  />
                  <SwitchField
                    label="Já possui equipe comercial?"
                    checked={form.watch("has_commercial_team")}
                    onChange={(v) => form.setValue("has_commercial_team", v)}
                  />
                  <SwitchField
                    label="Já utiliza CRM?"
                    checked={form.watch("uses_crm")}
                    onChange={(v) => form.setValue("uses_crm", v)}
                  />
                  <Field label="Quais canais usa hoje?">
                    <Textarea rows={2} {...form.register("current_channels")} />
                  </Field>
                  <Field label="Site atual">
                    <Input {...form.register("current_website")} />
                  </Field>
                  <Field label="Redes sociais">
                    <Textarea rows={2} {...form.register("social_media")} />
                  </Field>
                </Section>
              )}

              {step === 4 && (
                <Section title="Mercado e identidade">
                  <Field label="Concorrentes">
                    <Textarea rows={2} {...form.register("competitors")} />
                  </Field>
                  <Field label="Diferenciais da empresa">
                    <Textarea rows={3} {...form.register("differentials")} />
                  </Field>
                  <Field label="Tom de comunicação desejado">
                    <Input {...form.register("communication_tone")} />
                  </Field>
                  <Field label="Materiais já existentes">
                    <Textarea rows={2} {...form.register("existing_materials")} />
                  </Field>
                  <Field label="Acesso a contas e ferramentas">
                    <Textarea rows={2} {...form.register("tools_access")} />
                  </Field>
                </Section>
              )}

              {step === 5 && (
                <Section title="Projeto">
                  <Field label="Urgência do projeto">
                    <Input {...form.register("urgency")} />
                  </Field>
                  <Field label="Expectativa de prazo">
                    <Input {...form.register("expected_deadline")} />
                  </Field>
                  <Field label="Orçamento estimado">
                    <Input {...form.register("estimated_budget")} />
                  </Field>
                  <Field label="Observações adicionais">
                    <Textarea rows={4} {...form.register("additional_notes")} />
                  </Field>
                </Section>
              )}

              <div className="flex justify-between pt-4">
                {step > 1 ? (
                  <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                    Voltar
                  </Button>
                ) : <span />}
                {step < total ? (
                  <Button type="button" onClick={next}>Avançar</Button>
                ) : (
                  <Button type="submit" disabled={submit.isPending}>
                    {submit.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Enviar briefing
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Err({ msg }: { msg?: string }) {
  return <p className="text-xs text-destructive mt-1">{msg}</p>;
}

function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
