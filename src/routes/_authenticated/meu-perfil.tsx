import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2, Pencil, Save, X, Trophy, DollarSign, ListChecks, CalendarCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/jovens/StatusBadge";
import { PhaseBadge } from "@/components/jovens/PhaseBadge";
import {
  TRAIL_PHASE_LIST,
  TRAIL_PHASE_LABELS,
  type TrailPhase,
  type YoungPerson,
} from "@/types";

export const Route = createFileRoute("/_authenticated/meu-perfil")({
  head: () => ({ meta: [{ title: "Meu Perfil — MTX Hub" }] }),
  component: MeuPerfilPage,
});

const COMPLETION_FIELDS: (keyof YoungPerson)[] = [
  "photo_url", "birth_date", "cpf", "phone", "whatsapp", "address", "city", "state", "zip_code",
  "mother_name", "education_level", "school", "current_situation",
  "testimony", "dreams", "skills", "interest_area", "availability",
  "pix_key",
];

const PHASE_MESSAGES: Record<TrailPhase, string> = {
  fase_1: "Você está dando os primeiros passos. Continue firme!",
  fase_2: "Sua capacitação está evoluindo. Foco na excelência!",
  fase_3: "Sua vocação está sendo descoberta. Que fase incrível!",
  fase_4: "Você está colocando em prática tudo que aprendeu!",
  fase_5: "Você está gerando valor real. Isso é transformação!",
};

type FormState = Partial<YoungPerson>;

function MeuPerfilPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({});
  const [uploading, setUploading] = useState(false);

  const { data: young, isLoading } = useQuery({
    queryKey: ["my-young-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("young_people")
        .select("*")
        .eq("profile_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as YoungPerson | null;
    },
  });

  useEffect(() => {
    if (young) setForm(young);
  }, [young]);

  const completion = useMemo(() => {
    if (!young) return 0;
    const filled = COMPLETION_FIELDS.filter((f) => {
      const v = (young as any)[f];
      return v !== null && v !== undefined && v !== "";
    }).length;
    return Math.round((filled / COMPLETION_FIELDS.length) * 100);
  }, [young]);

  const { data: stats } = useQuery({
    queryKey: ["my-young-stats", young?.id],
    enabled: !!young?.id,
    queryFn: async () => {
      const [tasks, attendance] = await Promise.all([
        supabase
          .from("tasks")
          .select("status", { count: "exact" })
          .eq("young_responsible", young!.id)
          .eq("status", "concluida"),
        supabase
          .from("young_attendance")
          .select("present")
          .eq("young_id", young!.id)
          .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);
      const total = attendance.data?.length ?? 0;
      const present = attendance.data?.filter((a) => a.present).length ?? 0;
      return {
        tasksDone: tasks.count ?? 0,
        attendancePct: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      if (!young) throw new Error("Perfil não encontrado");
      // Whitelist of fields collaborator can edit (no name, status, phase, mentor, financials...)
      const allowed: (keyof YoungPerson)[] = [
        "photo_url", "birth_date", "cpf", "rg", "phone", "whatsapp",
        "address", "city", "state", "zip_code",
        "mother_name", "father_name", "legal_guardian", "guardian_contact",
        "education_level", "school", "current_situation", "family_income", "people_at_home",
        "testimony", "dreams", "skills", "interest_area", "availability",
        "has_laptop", "has_phone", "has_internet", "has_professional_chip",
        "pix_key", "bank_name", "bank_agency", "bank_account",
        "has_cnpj", "cnpj_type", "cnpj_opening_date",
      ];
      const update: any = {};
      for (const k of allowed) if (k in payload) update[k] = (payload as any)[k];

      const { error } = await supabase
        .from("young_people")
        .update(update)
        .eq("id", young.id);
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user!.id,
        action: "young_self_profile_updated",
        entity_type: "young_people",
        entity_id: young.id,
        description: "Jovem atualizou o próprio perfil",
      });
    },
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["my-young-profile"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar perfil"),
  });

  async function handleAvatarUpload(file: File) {
    if (!user || !young) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      setForm((f) => ({ ...f, photo_url: url }));
      // Persist immediately even outside edit mode
      await supabase.from("young_people").update({ photo_url: url }).eq("id", young.id);
      qc.invalidateQueries({ queryKey: ["my-young-profile"] });
      toast.success("Foto atualizada!");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!young) {
    return <CreateMyProfile />;
  }


  const initials = (young.full_name ?? "?").split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  const currentPhaseIdx = young.trail_phase ? TRAIL_PHASE_LIST.indexOf(young.trail_phase) : -1;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const v = <K extends keyof FormState>(k: K) => (form[k] ?? "") as any;
  const ro = !editing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-primary/40">
                <AvatarImage src={form.photo_url ?? young.photo_url ?? undefined} />
                <AvatarFallback className="bg-gradient-mtx text-lg font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-md hover:opacity-90"
                title="Trocar foto"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{young.full_name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {young.trail_phase && <PhaseBadge phase={young.trail_phase} />}
                <StatusBadge status={young.status} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <Button onClick={() => setEditing(true)} variant="default">
                <Pencil className="mr-2 h-4 w-4" /> Editar perfil
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setForm(young); setEditing(false); }}>
                  <X className="mr-2 h-4 w-4" /> Cancelar
                </Button>
                <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar alterações
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Perfil {completion}% completo</span>
            {completion < 100 && (
              <span className="text-muted-foreground">Complete seu perfil para que sua equipe te conheça melhor!</span>
            )}
          </div>
          <Progress value={completion} className="h-2" />
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="dados">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="dados">Meus dados</TabsTrigger>
          <TabsTrigger value="familia">Família</TabsTrigger>
          <TabsTrigger value="educacao">Educação</TabsTrigger>
          <TabsTrigger value="historia">Minha história</TabsTrigger>
          <TabsTrigger value="recursos">Recursos</TabsTrigger>
          <TabsTrigger value="profissional">Profissional</TabsTrigger>
          <TabsTrigger value="jornada">Minha jornada</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card className="space-y-4 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome completo" hint="Somente coordenação pode alterar">
                <Input value={young.full_name} readOnly disabled />
              </Field>
              <Field label="E-mail" hint="Vinculado à conta">
                <Input value={young.email ?? user?.email ?? ""} readOnly disabled />
              </Field>
              <Field label="Data de nascimento">
                <Input type="date" value={v("birth_date") || ""} readOnly={ro} onChange={(e) => set("birth_date", e.target.value)} />
              </Field>
              <Field label="CPF">
                <Input value={v("cpf")} readOnly={ro} onChange={(e) => set("cpf", e.target.value)} />
              </Field>
              <Field label="RG">
                <Input value={v("rg")} readOnly={ro} onChange={(e) => set("rg", e.target.value)} />
              </Field>
              <Field label="Telefone">
                <Input value={v("phone")} readOnly={ro} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label="WhatsApp">
                <Input value={v("whatsapp")} readOnly={ro} onChange={(e) => set("whatsapp", e.target.value)} />
              </Field>
              <Field label="CEP">
                <Input value={v("zip_code")} readOnly={ro} onChange={(e) => set("zip_code", e.target.value)} />
              </Field>
              <Field label="Endereço" className="md:col-span-2">
                <Input value={v("address")} readOnly={ro} onChange={(e) => set("address", e.target.value)} />
              </Field>
              <Field label="Cidade">
                <Input value={v("city")} readOnly={ro} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="Estado">
                <Input value={v("state")} readOnly={ro} onChange={(e) => set("state", e.target.value)} />
              </Field>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="familia">
          <Card className="space-y-4 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome da mãe">
                <Input value={v("mother_name")} readOnly={ro} onChange={(e) => set("mother_name", e.target.value)} />
              </Field>
              <Field label="Nome do pai">
                <Input value={v("father_name")} readOnly={ro} onChange={(e) => set("father_name", e.target.value)} />
              </Field>
              <Field label="Responsável legal (se menor)">
                <Input value={v("legal_guardian")} readOnly={ro} onChange={(e) => set("legal_guardian", e.target.value)} />
              </Field>
              <Field label="Contato do responsável">
                <Input value={v("guardian_contact")} readOnly={ro} onChange={(e) => set("guardian_contact", e.target.value)} />
              </Field>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="educacao">
          <Card className="space-y-4 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Escolaridade">
                <Input value={v("education_level")} readOnly={ro} onChange={(e) => set("education_level", e.target.value)} />
              </Field>
              <Field label="Instituição de ensino">
                <Input value={v("school")} readOnly={ro} onChange={(e) => set("school", e.target.value)} />
              </Field>
              <Field label="Situação atual">
                {ro ? (
                  <Input value={v("current_situation")} readOnly />
                ) : (
                  <Select value={v("current_situation") || undefined} onValueChange={(val) => set("current_situation", val)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estuda">Estuda</SelectItem>
                      <SelectItem value="trabalha">Trabalha</SelectItem>
                      <SelectItem value="estuda_trabalha">Estuda e trabalha</SelectItem>
                      <SelectItem value="desempregado">Desempregado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <Field label="Renda familiar">
                <Input value={v("family_income")} readOnly={ro} onChange={(e) => set("family_income", e.target.value)} />
              </Field>
              <Field label="Pessoas na casa">
                <Input type="number" value={v("people_at_home")} readOnly={ro} onChange={(e) => set("people_at_home", e.target.value ? Number(e.target.value) : null as any)} />
              </Field>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="historia">
          <Card className="space-y-4 p-6">
            <Field label="Testemunho / história pessoal">
              <Textarea rows={4} value={v("testimony")} readOnly={ro} onChange={(e) => set("testimony", e.target.value)} />
            </Field>
            <Field label="Sonhos e objetivos">
              <Textarea rows={3} value={v("dreams")} readOnly={ro} onChange={(e) => set("dreams", e.target.value)} />
            </Field>
            <Field label="Habilidades percebidas">
              <Textarea rows={3} value={v("skills")} readOnly={ro} onChange={(e) => set("skills", e.target.value)} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Área de interesse">
                <Input value={v("interest_area")} readOnly={ro} onChange={(e) => set("interest_area", e.target.value)} />
              </Field>
              <Field label="Disponibilidade de horário">
                <Input value={v("availability")} readOnly={ro} onChange={(e) => set("availability", e.target.value)} />
              </Field>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="recursos">
          <Card className="space-y-4 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <ToggleRow label="Possui notebook?" checked={!!form.has_laptop} disabled={ro} onChange={(c) => set("has_laptop", c)} />
              <ToggleRow label="Possui celular?" checked={!!form.has_phone} disabled={ro} onChange={(c) => set("has_phone", c)} />
              <ToggleRow label="Possui acesso à internet?" checked={!!form.has_internet} disabled={ro} onChange={(c) => set("has_internet", c)} />
              <ToggleRow label="Possui chip profissional?" checked={!!form.has_professional_chip} disabled={ro} onChange={(c) => set("has_professional_chip", c)} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="profissional">
          <Card className="space-y-4 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Chave Pix">
                <Input value={v("pix_key")} readOnly={ro} onChange={(e) => set("pix_key", e.target.value)} />
              </Field>
              <Field label="Banco">
                <Input value={v("bank_name")} readOnly={ro} onChange={(e) => set("bank_name", e.target.value)} />
              </Field>
              <Field label="Agência">
                <Input value={v("bank_agency")} readOnly={ro} onChange={(e) => set("bank_agency", e.target.value)} />
              </Field>
              <Field label="Conta">
                <Input value={v("bank_account")} readOnly={ro} onChange={(e) => set("bank_account", e.target.value)} />
              </Field>
            </div>
            <ToggleRow label="Possui CNPJ?" checked={!!form.has_cnpj} disabled={ro} onChange={(c) => set("has_cnpj", c)} />
            {form.has_cnpj && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tipo do CNPJ">
                  <Input value={v("cnpj_type")} readOnly={ro} onChange={(e) => set("cnpj_type", e.target.value)} />
                </Field>
                <Field label="Data de abertura">
                  <Input type="date" value={v("cnpj_opening_date") || ""} readOnly={ro} onChange={(e) => set("cnpj_opening_date", e.target.value)} />
                </Field>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="jornada">
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Minha trilha</h3>
              <ol className="space-y-3">
                {TRAIL_PHASE_LIST.map((p, idx) => {
                  const isCurrent = idx === currentPhaseIdx;
                  const isDone = currentPhaseIdx > idx;
                  return (
                    <li
                      key={p}
                      className={`flex items-center gap-3 rounded-lg border p-3 ${
                        isCurrent
                          ? "border-primary bg-primary/10"
                          : isDone
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-border bg-muted/30 opacity-60"
                      }`}
                    >
                      <div
                        className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                          isCurrent
                            ? "bg-gradient-mtx text-white"
                            : isDone
                              ? "bg-emerald-500 text-white"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span className="text-sm font-medium">{TRAIL_PHASE_LABELS[p]}</span>
                      {isCurrent && <span className="ml-auto text-xs font-semibold text-primary">Fase atual</span>}
                      {isDone && <span className="ml-auto text-xs text-emerald-600">Concluída</span>}
                    </li>
                  );
                })}
              </ol>
              {young.trail_phase && (
                <p className="mt-4 rounded-lg bg-gradient-mtx/10 p-3 text-sm italic text-foreground">
                  💫 {PHASE_MESSAGES[young.trail_phase]}
                </p>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Minhas conquistas</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Achievement
                  icon={<Trophy className="h-5 w-5" />}
                  label="Primeiro cliente"
                  value={young.first_client_attended ? (young.first_client_date ?? "Sim") : "Ainda não"}
                />
                <Achievement
                  icon={<DollarSign className="h-5 w-5" />}
                  label="Renda gerada"
                  value={`R$ ${Number(young.total_income_generated ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                />
                <Achievement
                  icon={<ListChecks className="h-5 w-5" />}
                  label="Tarefas concluídas"
                  value={String(stats?.tasksDone ?? 0)}
                />
                <Achievement
                  icon={<CalendarCheck className="h-5 w-5" />}
                  label="Presença no mês"
                  value={`${stats?.attendancePct ?? 0}%`}
                />
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

function Achievement({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="mb-2 flex items-center gap-2 text-primary">{icon}<span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span></div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function CreateMyProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const { data: created, error } = await supabase
        .from("young_people")
        .insert({
          full_name: profile?.full_name ?? user.email ?? "Sem nome",
          email: profile?.email ?? user.email ?? null,
          status: "em_formacao",
          trail_phase: "fase_1",
          entry_date: new Date().toISOString().split("T")[0],
          profile_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "young_self_created",
        entity_type: "young_people",
        entity_id: created.id,
        description: "Colaborador criou o próprio perfil",
      });

      // Marca notificação de boas-vindas como lida
      await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("entity_type", "self_profile");

      toast.success("Perfil criado com sucesso! Você já aparece na área de Jovens.");
      qc.invalidateQueries({ queryKey: ["my-young-profile"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-mtx text-white">
          <Trophy className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-2xl font-bold">Bem-vindo(a) à MTX 🎉</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie seu perfil na área de Jovens para que sua equipe te conheça melhor.
          Você poderá preencher seus dados depois — começamos com o básico.
        </p>
        <Button
          size="lg"
          onClick={handleCreate}
          disabled={creating}
          className="mt-6 bg-gradient-mtx text-white"
        >
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Criar meu perfil agora
        </Button>
      </Card>
    </div>
  );
}
