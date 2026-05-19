import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  UserPlus,
  Plus,
  Loader2,
  Calendar,
  Phone,
  Mail,
  AlertTriangle,
  Copy,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
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
import {
  FUNNEL_STAGES,
  INTERACTION_TYPES,
  PROPOSAL_STATUS_LABELS,
  type FunnelStage,
  type Opportunity,
} from "@/types/crm";
import { usePermissions } from "@/hooks/usePermissions";
import {
  EditRequestBanner,
  useEditRequestState,
} from "@/components/crm/EditRequestBanner";
import { ServiceMultiSelect } from "@/components/crm/ServiceMultiSelect";

export const Route = createFileRoute("/_authenticated/crm/$id")({
  head: () => ({ meta: [{ title: "Oportunidade — MTX Hub" }] }),
  component: OpportunityDetailPage,
});

const brl = (v: number | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

function OpportunityDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();

  const [showLoss, setShowLoss] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showInteraction, setShowInteraction] = useState(false);
  const [showProposal, setShowProposal] = useState(false);

  const { data: opp, isLoading } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Opportunity | null;
    },
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["opp-interactions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunity_interactions")
        .select("*")
        .eq("opportunity_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["opp-proposals", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("opportunity_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: oppServices = [] } = useQuery({
    queryKey: ["opp-services", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunity_services")
        .select("id, service_id")
        .eq("opportunity_id", id);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; service_id: string }>;
    },
  });

  const servicesMutation = useMutation({
    mutationFn: async (nextIds: string[]) => {
      const current = oppServices.map((s) => s.service_id);
      const toAdd = nextIds.filter((sid) => !current.includes(sid));
      const toRemove = oppServices.filter((s) => !nextIds.includes(s.service_id));
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("opportunity_services")
          .delete()
          .in(
            "id",
            toRemove.map((r) => r.id),
          );
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("opportunity_services")
          .insert(
            toAdd.map((sid) => ({
              opportunity_id: id,
              service_id: sid,
            })) as never,
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Serviços atualizados");
      qc.invalidateQueries({ queryKey: ["opp-services", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { hasActiveApproval } = useEditRequestState("opportunity", id);

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<Opportunity>) => {
      const { error } = await supabase
        .from("opportunities")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["opportunity", id] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!opp) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Oportunidade não encontrada.</p>
        <Button asChild variant="link"><Link to="/crm">Voltar ao CRM</Link></Button>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const isLate = opp.next_followup_date && opp.next_followup_date < today;
  const isClosed = opp.status !== "aberta";
  const canEdit = !isClosed || isAdmin || hasActiveApproval;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/crm"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
      </Button>

      <EditRequestBanner
        entityType="opportunity"
        entityId={id}
        entityLabel={`oportunidade "${opp.company_name}"`}
        locked={isClosed}
      />


      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{opp.company_name}</h1>
          <p className="text-sm text-muted-foreground">
            {opp.contact_name ?? "—"} · {opp.niche ?? "Sem nicho"}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={opp.status === "ganha" ? "default" : opp.status === "perdida" ? "destructive" : "secondary"}>
              {opp.status}
            </Badge>
            <Select
              value={opp.funnel_stage}
              onValueChange={(v) => updateMutation.mutate({ funnel_stage: v as FunnelStage })}
              disabled={!canEdit}
            >
              <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FUNNEL_STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {opp.status === "aberta" && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowConvert(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Converter em cliente
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateMutation.mutate({ status: "ganha" })}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar ganha
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setShowLoss(true)}>
              <XCircle className="h-4 w-4 mr-1" /> Marcar perdida
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da oportunidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Dor principal" value={opp.main_pain} />
            <Field label="Solução sugerida" value={opp.suggested_solution} />
            <Field label="Serviço ofertado" value={opp.offered_service} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor estimado" value={brl(opp.estimated_value)} />
              <Field label="Prioridade" value={opp.priority} />
            </div>
            <div>
              <Label className="text-xs">Probabilidade: {opp.closing_probability ?? 0}%</Label>
              <Slider
                value={[opp.closing_probability ?? 0]}
                onValueChange={(v) => updateMutation.mutate({ closing_probability: v[0] })}
                max={100}
                step={5}
                disabled={!canEdit}
              />
            </div>
            <Field label="Origem do lead" value={opp.lead_origin} />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Serviços ofertados
              </p>
              <ServiceMultiSelect
                value={oppServices.map((s) => s.service_id)}
                onChange={(ids) => servicesMutation.mutate(ids)}
                disabled={!canEdit || servicesMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contatos & Follow-up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {opp.email && (
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {opp.email}</p>
            )}
            {opp.phone && (
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {opp.phone}</p>
            )}
            {opp.whatsapp && (
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> WhatsApp: {opp.whatsapp}</p>
            )}
            <div>
              <Label className="text-xs">Último contato</Label>
              <Input
                type="date"
                defaultValue={opp.last_contact_date ?? ""}
                disabled={!canEdit}
                onBlur={(e) => updateMutation.mutate({ last_contact_date: e.target.value || null })}
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                Próximo follow-up
                {isLate && <AlertTriangle className="h-3 w-3 text-destructive" />}
              </Label>
              <Input
                type="date"
                defaultValue={opp.next_followup_date ?? ""}
                disabled={!canEdit}
                onBlur={(e) => updateMutation.mutate({ next_followup_date: e.target.value || null })}
              />
              {isLate && <p className="text-xs text-destructive mt-1">Follow-up atrasado</p>}
            </div>
            {opp.loss_reason && (
              <Field label="Motivo de perda" value={opp.loss_reason} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Histórico de interações</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowInteraction(true)}>
            <Plus className="h-4 w-4 mr-1" /> Registrar interação
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {interactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma interação registrada.</p>
          ) : (
            interactions.map((i) => (
              <div key={i.id} className="border-l-2 border-primary pl-3 py-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{i.type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    <Calendar className="inline h-3 w-3 mr-1" />
                    {new Date(i.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm mt-1">{i.description}</p>
                {i.next_action && (
                  <p className="text-xs text-muted-foreground mt-1">→ {i.next_action}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Propostas</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowProposal(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova proposta
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {proposals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma proposta registrada.</p>
          ) : (
            proposals.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded border p-2">
                <div>
                  <p className="text-sm font-medium">{p.title || "Proposta"}</p>
                  <p className="text-xs text-muted-foreground">
                    {brl(p.value)} · {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge variant="secondary">{PROPOSAL_STATUS_LABELS[p.status] ?? p.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <LossDialog
        open={showLoss}
        onOpenChange={setShowLoss}
        onConfirm={(reason) => {
          updateMutation.mutate({ status: "perdida", loss_reason: reason });
          setShowLoss(false);
        }}
      />
      <ConvertDialog
        open={showConvert}
        onOpenChange={setShowConvert}
        opp={opp}
        onConverted={(clientId) => {
          updateMutation.mutate({ status: "ganha", converted_client_id: clientId });
          setShowConvert(false);
          navigate({ to: "/clientes/$id", params: { id: clientId } });
        }}
      />
      <InteractionDialog
        open={showInteraction}
        onOpenChange={setShowInteraction}
        opportunityId={id}
        onSaved={() => qc.invalidateQueries({ queryKey: ["opp-interactions", id] })}
      />
      <ProposalDialog
        open={showProposal}
        onOpenChange={setShowProposal}
        opportunityId={id}
        onSaved={() => qc.invalidateQueries({ queryKey: ["opp-proposals", id] })}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

function LossDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Marcar como perdida</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Motivo da perda</Label>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={() => onConfirm(reason)}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConvertDialog({
  open,
  onOpenChange,
  opp,
  onConverted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  opp: Opportunity;
  onConverted: (clientId: string) => void;
}) {
  const [company, setCompany] = useState(opp.company_name);
  const [submitting, setSubmitting] = useState(false);

  const handle = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          company_name: company,
          contact_name: opp.contact_name,
          email: opp.email,
          phone: opp.phone,
          whatsapp: opp.whatsapp,
          niche: opp.niche,
          lead_origin: opp.lead_origin,
          status: "onboarding",
          entry_date: new Date().toISOString().slice(0, 10),
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Cliente criado");
      onConverted(data.id as string);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Converter em cliente</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Razão social</Label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Os dados de contato serão pré-preenchidos a partir da oportunidade.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handle} disabled={submitting || !company.trim()}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InteractionDialog({
  open,
  onOpenChange,
  opportunityId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  opportunityId: string;
  onSaved: () => void;
}) {
  const [type, setType] = useState("ligacao");
  const [description, setDescription] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handle = async () => {
    setSubmitting(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase.from("opportunity_interactions").insert({
        opportunity_id: opportunityId,
        recorded_by: userId,
        type,
        description,
        next_action: nextAction || null,
      } as never);
      if (error) throw error;
      await supabase.from("opportunities").update({ last_contact_date: new Date().toISOString().slice(0, 10) } as never).eq("id", opportunityId);
      toast.success("Interação registrada");
      setDescription("");
      setNextAction("");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar interação</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Próxima ação</Label>
            <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handle} disabled={submitting || !description.trim()}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProposalDialog({
  open,
  onOpenChange,
  opportunityId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  opportunityId: string;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("enviada");
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handle = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("proposals").insert({
        opportunity_id: opportunityId,
        title,
        value: value ? Number(value) : null,
        status,
        file_url: fileUrl || null,
        sent_at: status === "enviada" || status === "aceita" ? new Date().toISOString() : null,
      } as never);
      if (error) throw error;
      toast.success("Proposta registrada");
      setTitle(""); setValue(""); setFileUrl("");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova proposta</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="enviada">Enviada</SelectItem>
                <SelectItem value="aceita">Aceita</SelectItem>
                <SelectItem value="recusada">Recusada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Link do arquivo (opcional)</Label>
            <Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handle} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
