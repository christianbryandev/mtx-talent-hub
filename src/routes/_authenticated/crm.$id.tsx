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
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
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
  PROPOSAL_STATUS_FORM_LABELS,
  LEAD_ORIGIN_OPTIONS,
  type FunnelStage,
  type Opportunity,
  type OpportunityTemperature,
  type ProposalStatus,
} from "@/types/crm";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useEditRequestState,
} from "@/components/crm/EditRequestBanner";
import { ServiceMultiSelect, type ServicePaymentInfo } from "@/components/crm/ServiceMultiSelect";
import { ServiceYoungResponsibleSelect } from "@/components/crm/ServiceYoungResponsibleSelect";
import { ProfileSearchSelect } from "@/components/shared/RelationalSelects";

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
  useRealtimeInvalidate("opportunities", [["opportunity", id], ["opportunities"]]);
  useRealtimeInvalidate("opportunity_interactions", [["opp-interactions", id]]);
  useRealtimeInvalidate("proposals", [["opp-proposals", id]]);

  const [showLoss, setShowLoss] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showInteraction, setShowInteraction] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const [localPaymentInfo, setLocalPaymentInfo] = useState<ServicePaymentInfo[]>([]);
  const [localYoungResponsibles, setLocalYoungResponsibles] = useState<Record<string, string | null>>({});

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

  // Buscar nome de quem captou (commercial_responsible = ref do link de captação)
  const { data: capturedByName } = useQuery({
    queryKey: ["captured-by", opp?.commercial_responsible],
    enabled: !!opp?.commercial_responsible,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", opp!.commercial_responsible!)
        .single();
      return data?.full_name ?? null;
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
        .select("id, service_id, payment_method, installments, young_responsible_id, services(name, base_price, default_value, billing_model)")
        .eq("opportunity_id", id);
      if (error) throw error;
      return (data ?? []) as Array<any>;
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
        // Resolver automaticamente o jovem responsável para serviços com 1 jovem
        const rows = await Promise.all(
          toAdd.map(async (sid) => {
            let youngId: string | null = null;
            const { data: syp } = await supabase
              .from("service_young_people")
              .select("young_id")
              .eq("service_id", sid);
            if (syp && syp.length === 1) {
              youngId = syp[0].young_id;
            }
            return {
              opportunity_id: id,
              service_id: sid,
              young_responsible_id: youngId,
            };
          }),
        );
        const { error } = await supabase
          .from("opportunity_services")
          .insert(rows as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Serviços atualizados");
      qc.invalidateQueries({ queryKey: ["opp-services", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handlePaymentChange = async (info: ServicePaymentInfo[]) => {
    // Optimistic local update
    setLocalPaymentInfo(info);
    // Persist to database
    for (const item of info) {
      const row = oppServices.find((s) => s.service_id === item.serviceId);
      if (row) {
        const { error } = await supabase.from("opportunity_services")
          .update({ payment_method: item.paymentMethod, installments: item.installments } as never)
          .eq("id", row.id);
        if (error) {
          toast.error("Erro ao salvar forma de pagamento");
          return;
        }
      }
    }
    toast.success("Forma de pagamento salva");
    qc.invalidateQueries({ queryKey: ["opp-services", id] });
  };

  const handleYoungResponsibleChange = async (serviceId: string, youngId: string | null) => {
    setLocalYoungResponsibles((prev) => ({ ...prev, [serviceId]: youngId }));
    const row = oppServices.find((s) => s.service_id === serviceId);
    if (row) {
      const { error } = await supabase
        .from("opportunity_services")
        .update({ young_responsible_id: youngId } as never)
        .eq("id", row.id);
      if (error) {
        toast.error("Erro ao salvar responsável");
        return;
      }
      toast.success("Responsável atualizado");
      qc.invalidateQueries({ queryKey: ["opp-services", id] });
    }
  };

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

  /** Auto-compute qualification_score (0-10) and closing_probability (0-100) */
  const computeScores = (override: Partial<Opportunity> = {}) => {
    const merged = { ...opp, ...override };
    // Qualification score: sum of boolean criteria (each worth points)
    let score = 0;
    if (merged.has_demand) score += 2;
    if (merged.has_budget) score += 2;
    if (merged.has_urgency) score += 2;
    if (merged.is_icp) score += 2;
    if (merged.segment_validated) score += 1;
    // Bonus for lead origin (known sources = +1)
    if (merged.lead_origin && merged.lead_origin !== "Outro") score += 1;
    const qualification_score = Math.min(score, 10);

    // Probability: weighted from qualification + other factors
    let prob = qualification_score * 7; // base: up to 70%
    // Priority bonus
    if (merged.priority === "alta") prob += 10;
    else if (merged.priority === "media") prob += 5;
    // Value bonus (having an estimated value shows maturity)
    if (merged.estimated_value && merged.estimated_value > 0) prob += 5;
    // Offered service bonus
    if (merged.offered_service) prob += 5;
    // Temperature bonus
    if (merged.temperature === "quente") prob += 10;
    else if (merged.temperature === "morno") prob += 5;
    const closing_probability = Math.min(Math.round(prob / 5) * 5, 100);

    return { qualification_score, closing_probability };
  };

  /** Update a field and auto-recalculate scores */
  const updateWithScores = (patch: Partial<Opportunity>) => {
    const scores = computeScores(patch);
    updateMutation.mutate({ ...patch, ...scores });
  };

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


      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{opp.company_name}</h1>
          <p className="text-sm text-muted-foreground">
            {opp.contact_name ?? "—"} · {opp.niche ?? "Sem nicho"}
          </p>
          {capturedByName && (
            <p className="text-xs text-muted-foreground mt-1">
              Captado por: <span className="font-medium text-foreground">{capturedByName}</span>
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
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
            <div className="flex gap-1">
              {(["frio", "morno", "quente"] as OpportunityTemperature[]).map((t) => {
                const active = opp.temperature === t;
                const emoji = t === "frio" ? "🔵" : t === "morno" ? "🟡" : "🔴";
                return (
                  <Button
                    key={t}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className="h-7 px-2 text-xs"
                    disabled={!canEdit}
                    onClick={() => updateWithScores({ temperature: t })}
                  >
                    {emoji} {t}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
        {opp.status === "aberta" && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                qc.invalidateQueries({ queryKey: ["opportunity", id] });
                toast.success("Alterações salvas com sucesso!");
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Salvar Alterações
            </Button>
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
                onValueChange={() => {}}
                max={100}
                step={5}
                disabled
              />
            </div>
            <Field label="Origem do lead" value={opp.lead_origin} />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Serviços ofertados
              </p>
              <ServiceMultiSelect
                value={oppServices.map((s) => s.service_id)}
                onChange={(ids, totalSum) => {
                  servicesMutation.mutate(ids);
                  if (totalSum !== undefined) {
                    updateWithScores({ estimated_value: totalSum });
                  }
                }}
                disabled={!canEdit || servicesMutation.isPending}
                paymentInfo={(() => {
                  // Merge server data with local optimistic state
                  const serverInfo = oppServices.map((s) => ({
                    serviceId: s.service_id,
                    paymentMethod: (s.payment_method ?? "unico") as "unico" | "parcelado",
                    installments: s.installments ?? 1,
                  }));
                  // Local takes priority
                  return serverInfo.map((si) => {
                    const local = localPaymentInfo.find((l) => l.serviceId === si.serviceId);
                    return local ?? si;
                  });
                })()}
                onPaymentChange={canEdit ? handlePaymentChange : undefined}
              />
              {oppServices.length > 0 && (
                <div className="mt-2 space-y-1.5 p-2 bg-muted/40 rounded-md border border-border/50">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                    Jovem responsável por serviço
                  </p>
                  {oppServices.map((os) => {
                    const currentValue = localYoungResponsibles[os.service_id] !== undefined
                      ? localYoungResponsibles[os.service_id]
                      : os.young_responsible_id ?? null;
                    return (
                      <ServiceYoungResponsibleSelect
                        key={os.service_id}
                        serviceId={os.service_id}
                        serviceName={os.services?.name ?? "Serviço"}
                        value={currentValue}
                        onChange={(youngId) => handleYoungResponsibleChange(os.service_id, youngId)}
                        disabled={!canEdit}
                      />
                    );
                  })}
                </div>
              )}
            </div>
            {isAdmin && (
              <div className="pt-2 border-t mt-2">
                <Label className="text-xs mb-1 block">Responsável comercial</Label>
                <ProfileSearchSelect
                  roleFilter="comercial"
                  value={opp.commercial_responsible}
                  onChange={(v) => updateMutation.mutate({ commercial_responsible: v })}
                  disabled={!canEdit}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contatos & Follow-up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {opp.email && (
              <ContactRow icon={<Mail className="h-4 w-4 text-muted-foreground" />} value={opp.email} />
            )}
            {opp.phone && (
              <ContactRow icon={<Phone className="h-4 w-4 text-muted-foreground" />} value={opp.phone} />
            )}
            {opp.whatsapp && (
              <ContactRow icon={<Phone className="h-4 w-4 text-muted-foreground" />} value={opp.whatsapp} label="WhatsApp" />
            )}
            {opp.city && <Field label="Cidade" value={opp.city} />}
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Classificação</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ToggleField label="ICP — Ideal Customer Profile" value={opp.is_icp} disabled={!canEdit}
              onChange={(v) => updateWithScores({ is_icp: v })} />
            <ToggleField label="Segmento validado" value={opp.segment_validated} disabled={!canEdit}
              onChange={(v) => updateWithScores({ segment_validated: v })} />
            <div>
              <Label className="text-xs">Origem do lead</Label>
              <Select value={opp.lead_origin ?? ""} disabled={!canEdit}
                onValueChange={(v) => updateWithScores({ lead_origin: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {LEAD_ORIGIN_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Qualificação</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ToggleField label="Tem demanda clara?" value={opp.has_demand} disabled={!canEdit}
              onChange={(v) => updateWithScores({ has_demand: v })} />
            <ToggleField label="Tem orçamento disponível?" value={opp.has_budget} disabled={!canEdit}
              onChange={(v) => updateWithScores({ has_budget: v })} />
            <ToggleField label="Tem urgência?" value={opp.has_urgency} disabled={!canEdit}
              onChange={(v) => updateWithScores({ has_urgency: v })} />
            <div>
              <Label className="text-xs">Nota de qualificação: {opp.qualification_score ?? 0}/10</Label>
              <Slider value={[opp.qualification_score ?? 0]} max={10} step={1} disabled
                onValueChange={() => {}} />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Diagnóstico</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3 text-sm">
            <div>
              <Label className="text-xs">Problema identificado</Label>
              <Textarea rows={3} defaultValue={opp.problem_identified ?? ""} disabled={!canEdit}
                onBlur={(e) => updateMutation.mutate({ problem_identified: e.target.value || null })} />
            </div>
            <div>
              <Label className="text-xs">O que precisa melhorar</Label>
              <Textarea rows={3} defaultValue={opp.improvement_needed ?? ""} disabled={!canEdit}
                onBlur={(e) => updateMutation.mutate({ improvement_needed: e.target.value || null })} />
            </div>
            <div>
              <Label className="text-xs">Oportunidade de solução</Label>
              <Textarea rows={3} defaultValue={opp.solution_opportunity ?? ""} disabled={!canEdit}
                onBlur={(e) => updateMutation.mutate({ solution_opportunity: e.target.value || null })} />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Proposta</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3 text-sm">
            <div>
              <Label className="text-xs">Valor da proposta (R$)</Label>
              <Input type="number" step="0.01" defaultValue={opp.proposal_value ?? ""} disabled={!canEdit}
                onBlur={(e) => updateMutation.mutate({ proposal_value: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label className="text-xs">Data de envio</Label>
              <Input type="date" defaultValue={opp.proposal_sent_date ?? ""} disabled={!canEdit}
                onBlur={(e) => updateMutation.mutate({ proposal_sent_date: e.target.value || null })} />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={opp.proposal_status ?? ""} disabled={!canEdit}
                onValueChange={(v) => updateMutation.mutate({ proposal_status: v as ProposalStatus })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROPOSAL_STATUS_FORM_LABELS) as ProposalStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>{PROPOSAL_STATUS_FORM_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
        oppServices={oppServices}
        onConverted={(clientId) => {
          qc.invalidateQueries({ queryKey: ["opportunity", id] });
          qc.invalidateQueries({ queryKey: ["opportunities"] });
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

function ContactRow({ icon, value, label }: { icon: React.ReactNode; value: string; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="flex-1">{label ? `${label}: ` : ""}{value}</span>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
        onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiado"); }}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

function ToggleField({ label, value, onChange, disabled }: {
  label: string; value: boolean | null; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1">
        <Button size="sm" variant={value === true ? "default" : "outline"} className="h-7 px-2 text-xs"
          disabled={disabled} onClick={() => onChange(true)}>Sim</Button>
        <Button size="sm" variant={value === false ? "default" : "outline"} className="h-7 px-2 text-xs"
          disabled={disabled} onClick={() => onChange(false)}>Não</Button>
      </div>
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
  oppServices,
  onConverted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  opp: Opportunity;
  oppServices?: Array<any>;
  onConverted: (clientId: string) => void;
}) {
  const [company, setCompany] = useState(opp.company_name);
  const [submitting, setSubmitting] = useState(false);

  const handle = async () => {
    setSubmitting(true);
    try {
      // Verificar se a oportunidade já foi convertida (evitar duplicação)
      const { data: currentOpp } = await supabase
        .from("opportunities")
        .select("status, converted_client_id")
        .eq("id", opp.id)
        .single();
      if (currentOpp?.status === "ganha" && currentOpp?.converted_client_id) {
        toast.info("Esta oportunidade já foi convertida em cliente.");
        onConverted(currentOpp.converted_client_id);
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Re-buscar oppServices frescos para garantir young_responsible_id atualizado
      const { data: freshServices } = await supabase
        .from("opportunity_services")
        .select("id, service_id, payment_method, installments, young_responsible_id, services(name, base_price, default_value, billing_model)")
        .eq("opportunity_id", opp.id);
      const currentServices = (freshServices ?? oppServices) as Array<any>;

      // Calculate monthly_value from services or opportunity estimated_value
      const servicesTotal = currentServices && currentServices.length > 0
        ? currentServices.reduce((sum, s) => sum + (s.services?.default_value ?? s.services?.base_price ?? 0), 0)
        : null;
      const monthlyValue = servicesTotal || opp.estimated_value || null;

      // Determinar o jovem responsável principal (primeiro encontrado nos serviços)
      const youngResponsibleId = currentServices?.find((s) => s.young_responsible_id)?.young_responsible_id ?? null;

      const { data, error } = await supabase
        .from("clients")
        .insert({
          company_name: company,
          trade_name: opp.trade_name ?? null,
          contact_name: opp.contact_name,
          email: opp.email,
          phone: opp.phone,
          whatsapp: opp.whatsapp,
          niche: opp.niche,
          segment: opp.niche,
          lead_origin: opp.lead_origin,
          status: "ativo",
          entry_date: today,
          contract_start: today,
          contract_end: endDate,
          monthly_value: monthlyValue,
          setup_value: opp.proposal_value ?? opp.estimated_value ?? null,
          active_contract: true,
          commercial_responsible: opp.commercial_responsible ?? null,
          young_responsible: youngResponsibleId,
        } as never)
        .select("id")
        .single();
      if (error) throw error;

      // Marcar oportunidade como "ganha" ANTES de inserir services (evita duplicação se services falhar)
      await supabase
        .from("opportunities")
        .update({ status: "ganha", converted_client_id: data.id } as never)
        .eq("id", opp.id);

      if (currentServices && currentServices.length > 0) {
        const { error: svcError } = await supabase.from("client_services").insert(
          currentServices.map((s) => {
            const billingModel = s.services?.billing_model ?? "mensal";
            const baseValue = Number(s.services?.default_value ?? s.services?.base_price ?? 0);
            const payMethod = s.payment_method ?? "unico";
            const numInstallments = s.installments ?? 1;
            const isPontual = billingModel === "pontual";

            return {
              client_id: data.id,
              service_id: s.service_id,
              service_name: s.services?.name ?? "Serviço",
              billing_type: billingModel,
              payment_method: isPontual ? payMethod : "unico",
              installments: isPontual ? numInstallments : 1,
              total_value: isPontual ? baseValue : null,
              monthly_value: isPontual
                ? (payMethod === "parcelado" && numInstallments > 1 ? Math.round((baseValue / numInstallments) * 100) / 100 : baseValue)
                : baseValue,
              start_date: today,
              status: "ativo",
              executor_id: s.young_responsible_id ?? null,
            };
          }) as never
        );
        if (svcError) throw svcError;

        // Marcar jovens responsáveis como remunerados e atualizar renda
        const youngIds = [...new Set(currentServices.map((s) => s.young_responsible_id).filter(Boolean))] as string[];
        for (const youngId of youngIds) {
          const youngServices = currentServices.filter((s) => s.young_responsible_id === youngId);
          const youngRevenue = youngServices.reduce((sum, s) => sum + (s.services?.default_value ?? s.services?.base_price ?? 0), 0);

          // Buscar renda atual do jovem e somar
          const { data: currentYoung } = await supabase
            .from("young_people")
            .select("total_income_generated")
            .eq("id", youngId)
            .single();
          const currentIncome = Number(currentYoung?.total_income_generated) || 0;

          await supabase
            .from("young_people")
            .update({
              first_client_attended: true,
              total_income_generated: currentIncome + youngRevenue,
            } as never)
            .eq("id", youngId);
        }
      }

      toast.success("Cliente criado com sucesso");

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
