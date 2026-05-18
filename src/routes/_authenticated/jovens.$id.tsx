import { useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil, MessageSquarePlus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/jovens/StatusBadge";
import { PhaseBadge } from "@/components/jovens/PhaseBadge";
import {
  YOUNG_STATUS_LIST,
  YOUNG_STATUS_LABELS,
  TRAIL_PHASE_LIST,
  TRAIL_PHASE_LABELS,
  type YoungPerson,
  type YoungEvolution,
  type YoungStatus,
  type TrailPhase,
} from "@/types";

export const Route = createFileRoute("/_authenticated/jovens/$id")({
  head: () => ({ meta: [{ title: "Perfil do Jovem — MTX Hub" }] }),
  component: JovemDetailPage,
});

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{value || "—"}</div>
    </div>
  );
}

function JovemDetailPage() {
  const { id } = useParams({ from: "/_authenticated/jovens/$id" });
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [phaseModalOpen, setPhaseModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<YoungStatus | "">("");
  const [newPhase, setNewPhase] = useState<TrailPhase | "">("");
  const [note, setNote] = useState("");

  const { data: y, isLoading } = useQuery({
    queryKey: ["young_people", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("young_people")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as YoungPerson | null;
    },
  });

  const { data: evolution = [] } = useQuery({
    queryKey: ["young_evolution", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("young_evolution")
        .select("*")
        .eq("young_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as YoungEvolution[];
    },
  });

  const { data: mentor } = useQuery({
    queryKey: ["profile", y?.mentor_id],
    enabled: !!y?.mentor_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", y!.mentor_id!)
        .maybeSingle();
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async () => {
      if (!newStatus || !y) return;
      const prev = y.status;
      const { error } = await supabase.from("young_people").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      await supabase.from("young_evolution").insert({
        young_id: id,
        recorded_by: user?.id ?? null,
        type: "status_change",
        previous_value: prev,
        new_value: newStatus,
        description: `Status alterado: ${YOUNG_STATUS_LABELS[prev]} → ${YOUNG_STATUS_LABELS[newStatus]}`,
      });
      await supabase.from("activity_logs").insert({
        user_id: user?.id ?? null,
        action: "young_status_changed",
        entity_type: "young_people",
        entity_id: id,
        description: `Status de ${y.full_name}: ${YOUNG_STATUS_LABELS[prev]} → ${YOUNG_STATUS_LABELS[newStatus]}`,
      });
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["young_people", id] });
      qc.invalidateQueries({ queryKey: ["young_evolution", id] });
      qc.invalidateQueries({ queryKey: ["young_people"] });
      setStatusModalOpen(false);
      setNewStatus("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePhase = useMutation({
    mutationFn: async () => {
      if (!newPhase || !y) return;
      const prev = y.trail_phase;
      const { error } = await supabase.from("young_people").update({ trail_phase: newPhase }).eq("id", id);
      if (error) throw error;
      await supabase.from("young_evolution").insert({
        young_id: id,
        recorded_by: user?.id ?? null,
        type: "phase_change",
        previous_value: prev,
        new_value: newPhase,
        description: `Fase alterada${prev ? `: ${TRAIL_PHASE_LABELS[prev]} → ` : ": "}${TRAIL_PHASE_LABELS[newPhase]}`,
      });
    },
    onSuccess: () => {
      toast.success("Fase atualizada");
      qc.invalidateQueries({ queryKey: ["young_people", id] });
      qc.invalidateQueries({ queryKey: ["young_evolution", id] });
      setPhaseModalOpen(false);
      setNewPhase("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!note.trim()) return;
      const { error } = await supabase.from("young_evolution").insert({
        young_id: id,
        recorded_by: user?.id ?? null,
        type: "note",
        description: note.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Observação registrada");
      qc.invalidateQueries({ queryKey: ["young_evolution", id] });
      setNote("");
      setNoteModalOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!y) {
    return (
      <Card className="p-10 text-center">
        <p className="text-muted-foreground">Jovem não encontrado.</p>
        <Button asChild className="mt-4"><Link to="/jovens">Voltar</Link></Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/jovens"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <Avatar className="h-16 w-16 border-2 border-primary/30">
            {y.photo_url && <AvatarImage src={y.photo_url} />}
            <AvatarFallback className="bg-primary/15 font-bold text-primary">
              {y.full_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{y.full_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={y.status} />
              <PhaseBadge phase={y.trail_phase} />
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setStatusModalOpen(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Mudar status
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPhaseModalOpen(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Mudar fase
            </Button>
            <Button size="sm" onClick={() => setNoteModalOpen(true)}>
              <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" /> Observação
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="profile">Perfil e História</TabsTrigger>
          <TabsTrigger value="trail">Trilha e Evolução</TabsTrigger>
          <TabsTrigger value="professional">Dados Profissionais</TabsTrigger>
          <TabsTrigger value="notes">Observações</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-3"><Field label="Idade" value={y.age ?? "—"} /></Card>
            <Card className="p-3"><Field label="Cidade" value={y.city ?? "—"} /></Card>
            <Card className="p-3"><Field label="Área de vocação" value={y.vocation_area ?? y.interest_area ?? "—"} /></Card>
            <Card className="p-3"><Field label="Mentor" value={mentor?.full_name ?? mentor?.email ?? "—"} /></Card>
            <Card className="p-3"><Field label="Entrada" value={y.entry_date ? new Date(y.entry_date).toLocaleDateString("pt-BR") : "—"} /></Card>
            <Card className="p-3">
              <Field
                label="Renda gerada"
                value={
                  <span className="font-semibold text-emerald-400">
                    R$ {Number(y.total_income_generated ?? 0).toFixed(2)}
                  </span>
                }
              />
            </Card>
            <Card className="p-3">
              <Field
                label="Primeiro cliente"
                value={
                  y.first_client_attended
                    ? `Sim${y.first_client_date ? ` (${new Date(y.first_client_date).toLocaleDateString("pt-BR")})` : ""}`
                    : "Não"
                }
              />
            </Card>
            <Card className="p-3">
              <Field
                label="CNPJ"
                value={y.has_cnpj ? `Sim${y.cnpj_type ? ` • ${y.cnpj_type}` : ""}` : "Não"}
              />
            </Card>
          </div>

          <Card className="p-4">
            <div className="mb-3 text-sm font-semibold">Equipamentos</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Laptop", y.has_laptop],
                ["Celular", y.has_phone],
                ["Internet", y.has_internet],
                ["Chip profissional", y.has_professional_chip],
              ].map(([label, has]) => (
                <div key={label as string} className="flex items-center gap-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${has ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
                  {label}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Dados Pessoais */}
        <TabsContent value="personal" className="mt-4">
          <Card className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nome completo" value={y.full_name} />
            <Field label="Data de nascimento" value={y.birth_date ? new Date(y.birth_date).toLocaleDateString("pt-BR") : "—"} />
            <Field label="CPF" value={y.cpf} />
            <Field label="RG" value={y.rg} />
            <Field label="Telefone" value={y.phone} />
            <Field label="WhatsApp" value={y.whatsapp} />
            <Field label="E-mail" value={y.email} />
            <Field label="Endereço" value={y.address} />
            <Field label="Cidade" value={y.city} />
            <Field label="Estado" value={y.state} />
            <Field label="CEP" value={y.zip_code} />
            <Separator className="sm:col-span-2 lg:col-span-3" />
            <Field label="Mãe" value={y.mother_name} />
            <Field label="Pai" value={y.father_name} />
            <Field label="Responsável legal" value={y.legal_guardian} />
            <Field label="Contato do responsável" value={y.guardian_contact} />
          </Card>
        </TabsContent>

        {/* Perfil e História */}
        <TabsContent value="profile" className="mt-4">
          <Card className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <Field label="Situação atual" value={y.current_situation} />
            <Field label="Renda familiar" value={y.family_income} />
            <Field label="Pessoas em casa" value={y.people_at_home} />
            <Field label="Disponibilidade" value={y.availability} />
            <div className="sm:col-span-2"><Field label="Contexto social" value={y.social_context} /></div>
            <div className="sm:col-span-2"><Field label="Testemunho / história" value={y.testimony} /></div>
            <div className="sm:col-span-2"><Field label="Sonhos e objetivos" value={y.dreams} /></div>
            <div className="sm:col-span-2"><Field label="Habilidades percebidas" value={y.skills} /></div>
            <Field label="Área de interesse" value={y.interest_area} />
            <Field label="Área de vocação" value={y.vocation_area} />
          </Card>
        </TabsContent>

        {/* Trilha e Evolução */}
        <TabsContent value="trail" className="mt-4 space-y-4">
          <Card className="p-5">
            <div className="text-sm font-semibold mb-3">Trilha de Formação</div>
            <div className="space-y-2">
              {TRAIL_PHASE_LIST.map((p) => {
                const isCurrent = y.trail_phase === p;
                const idx = TRAIL_PHASE_LIST.indexOf(p);
                const currentIdx = y.trail_phase ? TRAIL_PHASE_LIST.indexOf(y.trail_phase) : -1;
                const isPast = currentIdx > idx;
                return (
                  <div
                    key={p}
                    className={`flex items-center gap-3 rounded-md border p-3 ${
                      isCurrent ? "border-primary bg-primary/10" : isPast ? "border-emerald-700/30 bg-emerald-700/5" : "border-border"
                    }`}
                  >
                    <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      isCurrent ? "bg-primary text-primary-foreground" : isPast ? "bg-emerald-700/30 text-emerald-300" : "bg-muted text-muted-foreground"
                    }`}>{idx + 1}</div>
                    <span className={isCurrent ? "font-semibold" : ""}>{TRAIL_PHASE_LABELS[p]}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold mb-3">Histórico de Evolução</div>
            {evolution.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-border pl-5">
                {evolution.map((ev) => (
                  <li key={ev.id} className="relative">
                    <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                    <div className="text-xs text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString("pt-BR")}
                    </div>
                    <div className="text-sm">{ev.description}</div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </TabsContent>

        {/* Dados Profissionais */}
        <TabsContent value="professional" className="mt-4">
          <Card className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Possui CNPJ" value={y.has_cnpj ? "Sim" : "Não"} />
            <Field label="Tipo CNPJ" value={y.cnpj_type} />
            <Field label="Abertura CNPJ" value={y.cnpj_opening_date ? new Date(y.cnpj_opening_date).toLocaleDateString("pt-BR") : "—"} />
            <Field label="Chave Pix" value={y.pix_key} />
            <Field label="Banco" value={y.bank_name} />
            <Field label="Agência" value={y.bank_agency} />
            <Field label="Conta" value={y.bank_account} />
            <Field label="Renda gerada" value={`R$ ${Number(y.total_income_generated ?? 0).toFixed(2)}`} />
            <Field label="Primeiro cliente" value={y.first_client_attended ? "Sim" : "Não"} />
          </Card>
        </TabsContent>

        {/* Observações */}
        <TabsContent value="notes" className="mt-4 space-y-4">
          {isAdmin && (
            <Card className="p-4">
              <Button onClick={() => setNoteModalOpen(true)} variant="outline" className="w-full">
                <MessageSquarePlus className="mr-2 h-4 w-4" /> Registrar nova observação
              </Button>
            </Card>
          )}
          <Card className="p-5">
            {evolution.filter((e) => e.type === "note").length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma observação registrada.</p>
            ) : (
              <div className="space-y-3">
                {evolution
                  .filter((e) => e.type === "note")
                  .map((n) => (
                    <div key={n.id} className="rounded-md border border-border bg-card/50 p-3">
                      <div className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("pt-BR")}
                      </div>
                      <div className="mt-1 text-sm whitespace-pre-wrap">{n.description}</div>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal status */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mudar status</DialogTitle></DialogHeader>
          <Select value={newStatus} onValueChange={(v) => setNewStatus(v as YoungStatus)}>
            <SelectTrigger><SelectValue placeholder="Novo status" /></SelectTrigger>
            <SelectContent>
              {YOUNG_STATUS_LIST.map((s) => (
                <SelectItem key={s} value={s}>{YOUNG_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => updateStatus.mutate()} disabled={!newStatus || updateStatus.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal fase */}
      <Dialog open={phaseModalOpen} onOpenChange={setPhaseModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mudar fase da trilha</DialogTitle></DialogHeader>
          <Select value={newPhase} onValueChange={(v) => setNewPhase(v as TrailPhase)}>
            <SelectTrigger><SelectValue placeholder="Nova fase" /></SelectTrigger>
            <SelectContent>
              {TRAIL_PHASE_LIST.map((p) => (
                <SelectItem key={p} value={p}>{TRAIL_PHASE_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhaseModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => updatePhase.mutate()} disabled={!newPhase || updatePhase.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal nota */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova observação</DialogTitle></DialogHeader>
          <Textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Escreva a observação..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => addNote.mutate()} disabled={!note.trim() || addNote.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
