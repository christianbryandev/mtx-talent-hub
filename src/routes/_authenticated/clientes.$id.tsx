import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Mail,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteClientCascade } from "@/lib/cascade-delete";

import { supabase } from "@/integrations/supabase/client";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientStatusBadge } from "@/components/clientes/ClientStatusBadge";
import {
  CLIENT_HISTORY_TYPES,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_LIST,
  COMPANY_SIZES,
  type ClientStatus,
} from "@/types/clients";
import { usePermissions } from "@/hooks/usePermissions";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  head: () => ({ meta: [{ title: "Cliente — MTX Hub" }] }),
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin, isComercial, isSuperAdmin } = usePermissions();
  const canEdit = isAdmin || isComercial;
  useRealtimeInvalidate("clients", [["client", id], ["clients"]]);
  useRealtimeInvalidate("client_services", [["client-services", id]]);
  useRealtimeInvalidate("client_history", [["client-history", id]]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteClientCascade(id),
    onSuccess: () => {
      toast.success("Cliente excluído");
      qc.invalidateQueries({ queryKey: ["clients"] });
      navigate({ to: "/clientes" });
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao excluir"),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!client?.email) throw new Error("O cliente não possui um e-mail cadastrado. Atualize os dados da empresa primeiro.");

      const res = await supabase.functions.invoke("invite-client", {
        body: { 
          email: client.email, 
          nome: client.contact_name || client.trade_name || client.company_name 
        },
      });

      if (res.error) throw new Error(res.error.message || "Erro ao comunicar com o servidor");
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      toast.success("E-mail de boas-vindas com o acesso foi enviado com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao gerar acesso"),
  });

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["client-services", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_services")
        .select("*, young_people:executor_id(id, full_name)")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<any>;
    },
  });

  const { data: briefing } = useQuery({
    queryKey: ["client-briefing", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_briefings")
        .select("*")
        .eq("client_id", id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["client-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_history")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/clientes" })}>
          Voltar
        </Button>
      </div>
    );
  }

  const fmtBRL = (n: number | null | undefined) =>
    n == null ? "—" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const briefingUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/briefing/${id}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/clientes" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-2xl font-bold truncate">
            {client.trade_name || client.company_name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <ClientStatusBadge status={client.status as ClientStatus} />
            {client.segment && (
              <Badge variant="outline">{client.segment}</Badge>
            )}
            {client.active_contract && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                Contrato ativo
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button
              variant="default"
              size="sm"
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || !client.email}
              title={!client.email ? "Cadastre um e-mail nos Dados da Empresa para gerar acesso" : "Enviar e-mail de acesso"}
            >
              {inviteMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
              Gerar Acesso
            </Button>
          )}
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="company">Dados da empresa</TabsTrigger>
          <TabsTrigger value="briefing">Briefing</TabsTrigger>
          <TabsTrigger value="services">Serviços e contrato</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <InfoCard label="Valor mensal" value={fmtBRL(client.monthly_value)} />
            <InfoCard
              label="Data de entrada"
              value={client.entry_date ? new Date(client.entry_date).toLocaleDateString("pt-BR") : "—"}
            />
            <InfoCard label="Contrato ativo" value={client.active_contract ? "Sim" : "Não"} />
            <InfoCard
              label="Jovem(ns) responsável(is)"
              value={(() => {
                const youngs = services
                  .filter((s: any) => s.young_people?.full_name)
                  .map((s: any) => s.young_people.full_name);
                const unique = [...new Set(youngs)];
                return unique.length > 0 ? unique.join(", ") : "—";
              })()}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Presença digital</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 text-sm">
              {client.website && (
                <a href={client.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> Website
                </a>
              )}
              {client.instagram && (
                <a href={`https://instagram.com/${client.instagram.replace("@","")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> Instagram
                </a>
              )}
              {client.linkedin && (
                <a href={client.linkedin.startsWith("http") ? client.linkedin : `https://linkedin.com/${client.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> LinkedIn
                </a>
              )}
              {!client.website && !client.instagram && !client.linkedin && (
                <span className="text-muted-foreground">Nenhum link cadastrado.</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Serviços contratados</CardTitle>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado.</p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {services.map((s: any) => (
                    <li key={s.id} className="py-2 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{s.service_name}</p>
                          {s.young_people?.full_name && (
                            <p className="text-xs text-muted-foreground">Responsável: {s.young_people.full_name}</p>
                          )}
                        </div>
                        <div className="text-right text-xs">
                          <p className="font-medium">{fmtBRL(s.monthly_value)}{s.billing_type === "mensal" ? "/mês" : ""}</p>
                          <p className="text-muted-foreground">
                            {s.billing_type === "mensal" ? "Mensal" : s.billing_type === "pontual" && s.total_value && s.monthly_value < s.total_value ? `Parcelado ${s.installments}x` : "Pontual à vista"}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimas atividades</CardTitle>
            </CardHeader>
            <CardContent>
              {history.slice(0, 5).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem registros.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {history.slice(0, 5).map((h) => (
                    <li key={h.id} className="flex justify-between border-b border-border/40 pb-2">
                      <div>
                        <span className="font-medium capitalize">{h.type}</span>
                        <span className="text-muted-foreground"> — {h.description}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <CompanyDataTab clientId={id} canEdit={canEdit} client={client} />
        </TabsContent>

        <TabsContent value="briefing" className="space-y-4">
          {!briefing ? (
            <Card>
              <CardContent className="p-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Este cliente ainda não preencheu o briefing.
                </p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={briefingUrl} />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(briefingUrl);
                      toast.success("Link copiado");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" /> Copiar link
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Briefing preenchido</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
                <BriefField label="Empresa" value={briefing.company_name} />
                <BriefField label="Responsável" value={briefing.contact_name} />
                <BriefField label="Segmento" value={briefing.segment} />
                <BriefField label="Produtos/serviços" value={briefing.main_products} />
                <BriefField label="Público-alvo" value={briefing.target_audience} />
                <BriefField label="Principais dores" value={briefing.main_pains} long />
                <BriefField label="Maior desafio" value={briefing.biggest_challenge} long />
                <BriefField label="Objetivos com a MTX" value={briefing.goals_with_mtx} long />
                <BriefField label="Metas comerciais" value={briefing.commercial_goals} long />
                <BriefField label="Metas de marketing" value={briefing.marketing_goals} long />
                <BriefField label="Investe em marketing?" value={fmtBool(briefing.invests_in_marketing)} />
                <BriefField label="Equipe comercial?" value={fmtBool(briefing.has_commercial_team)} />
                <BriefField label="Usa CRM?" value={fmtBool(briefing.uses_crm)} />
                <BriefField label="Canais atuais" value={briefing.current_channels} />
                <BriefField label="Concorrentes" value={briefing.competitors} long />
                <BriefField label="Diferenciais" value={briefing.differentials} long />
                <BriefField label="Tom de comunicação" value={briefing.communication_tone} />
                <BriefField label="Urgência" value={briefing.urgency} />
                <BriefField label="Prazo esperado" value={briefing.expected_deadline} />
                <BriefField label="Orçamento estimado" value={briefing.estimated_budget} />
                <BriefField label="Observações" value={briefing.additional_notes} long />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="services">
          <ServicesTab clientId={id} canEdit={canEdit} client={client} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab clientId={id} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab clientId={id} canEdit={canEdit} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir cliente"
        description={
          <>
            Esta ação remove o cliente <strong>{client.company_name}</strong>, seu briefing,
            histórico, serviços contratados e propostas. Tarefas e oportunidades vinculadas
            serão desvinculadas. Não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir cliente"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}

function fmtBool(v: boolean | null | undefined) {
  return v == null ? "—" : v ? "Sim" : "Não";
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function BriefField({ label, value, long }: { label: string; value: string | null | undefined; long?: boolean }) {
  return (
    <div className={long ? "md:col-span-2" : ""}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );
}

// ----- COMPANY DATA TAB -----
function CompanyDataTab({
  clientId,
  canEdit,
  client,
}: {
  clientId: string;
  canEdit: boolean;
  client: Record<string, unknown>;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const key of [
      "company_name","trade_name","cnpj","segment","niche","company_size",
      "contact_name","contact_role","phone","whatsapp","email",
      "address","city","state","status",
    ]) {
      const v = client[key];
      init[key] = v == null ? "" : String(v);
    }
    return init;
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("clients")
        .update(form as never)
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados atualizados");
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fields: [string, string, string?][] = [
    ["company_name", "Razão social"],
    ["trade_name", "Nome fantasia"],
    ["cnpj", "CNPJ"],
    ["segment", "Segmento"],
    ["niche", "Nicho"],
    ["contact_name", "Responsável"],
    ["contact_role", "Cargo"],
    ["phone", "Telefone"],
    ["whatsapp", "WhatsApp"],
    ["email", "E-mail"],
    ["address", "Endereço"],
    ["city", "Cidade"],
    ["state", "Estado"],
  ];

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {fields.map(([key, label]) => (
            <div key={key}>
              <Label>{label}</Label>
              <Input
                disabled={!canEdit}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <Label>Porte</Label>
            <Select
              disabled={!canEdit}
              value={form.company_size}
              onValueChange={(v) => setForm((f) => ({ ...f, company_size: v }))}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {COMPANY_SIZES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select
              disabled={!canEdit}
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLIENT_STATUS_LIST.map((s) => (
                  <SelectItem key={s} value={s}>{CLIENT_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar alterações
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ----- SERVICES TAB -----
function ServicesTab({
  clientId,
  canEdit,
  client,
}: {
  clientId: string;
  canEdit: boolean;
  client: Record<string, unknown>;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState<string>("");
  const [monthlyValue, setMonthlyValue] = useState("");

  const { data: catalog = [] } = useQuery({
    queryKey: ["services-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, base_price")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: canEdit,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["client-services", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_services")
        .select("*, young_people:executor_id(id, full_name)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<any>;
    },
  });

  const addService = useMutation({
    mutationFn: async () => {
      const svc = catalog.find((c) => c.id === serviceId);
      const { error } = await supabase.from("client_services").insert({
        client_id: clientId,
        service_id: serviceId || null,
        service_name: svc?.name ?? "Serviço",
        monthly_value: monthlyValue ? Number(monthlyValue) : svc?.base_price ?? null,
        status: "ativo",
        start_date: new Date().toISOString().slice(0, 10),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Serviço adicionado");
      qc.invalidateQueries({ queryKey: ["client-services", clientId] });
      setOpen(false);
      setServiceId("");
      setMonthlyValue("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fmtBRL = (n: number | null | undefined) =>
    n == null ? "—" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Serviços contratados</CardTitle>
          {canEdit && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum serviço.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {services.map((s) => (
                <li key={s.id} className="flex justify-between items-center py-2 text-sm">
                  <div>
                    <p className="font-medium">{s.service_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.start_date ? `Início: ${new Date(s.start_date).toLocaleDateString("pt-BR")}` : ""}
                      {s.young_people?.full_name ? ` · Responsável: ${s.young_people.full_name}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.billing_type === "mensal" ? "Mensal" : s.billing_type === "pontual" && s.total_value && Number(s.monthly_value) < Number(s.total_value) ? `Pontual parcelado (${s.installments}x de ${fmtBRL(s.monthly_value)})` : `Pontual à vista`}
                      {s.total_value && s.billing_type === "pontual" ? ` · Total: ${fmtBRL(s.total_value)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <Badge variant="outline">{s.status}</Badge>
                      <p className="text-xs mt-1 font-medium">{fmtBRL(s.monthly_value)}{s.billing_type === "mensal" ? "/mês" : ""}</p>
                    </div>
                    {canEdit && s.status !== "ativo" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const { data, error } = await supabase.rpc("activate_client_service" as never, { _client_service_id: s.id } as never);
                          if (error) { toast.error(error.message); return; }
                          const created = (data as { tasks_created?: number } | null)?.tasks_created ?? 0;
                          toast.success(`Serviço ativado · ${created} tarefa(s) criada(s)`);
                          qc.invalidateQueries({ queryKey: ["client-services", clientId] });
                        }}
                      >
                        Ativar
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contrato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
          <InfoCard
            label="Início"
            value={(client.contract_start as string) ? new Date(client.contract_start as string).toLocaleDateString("pt-BR") : "—"}
          />
          <InfoCard
            label="Término"
            value={(client.contract_end as string) ? new Date(client.contract_end as string).toLocaleDateString("pt-BR") : "—"}
          />
          <InfoCard label="Valor mensal" value={fmtBRL(client.monthly_value as number)} />
          <InfoCard label="Setup" value={fmtBRL(client.setup_value as number)} />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Serviço</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {catalog.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Nenhum serviço no catálogo. Cadastre em /servicos.
                    </div>
                  ) : (
                    catalog.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={monthlyValue}
                onChange={(e) => setMonthlyValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => addService.mutate()}
              disabled={!serviceId || addService.isPending}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ----- HISTORY TAB -----
function HistoryTab({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const [type, setType] = useState("reuniao");
  const [filter, setFilter] = useState<string>("all");
  const [description, setDescription] = useState("");

  const { data: history = [] } = useQuery({
    queryKey: ["client-history", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_history")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase.from("client_history").insert({
        client_id: clientId,
        recorded_by: userId,
        type,
        description,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Interação registrada");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["client-history", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = filter === "all" ? history : history.filter((h) => h.type === filter);

  return (
    <div className="space-y-4">
      {canEdit && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_HISTORY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Descrição da interação"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button onClick={() => add.mutate()} disabled={!description || add.isPending}>
                Registrar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Label className="text-xs">Filtrar:</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {CLIENT_HISTORY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem interações.</p>
          ) : (
            <ol className="relative border-l border-border/40 ml-2 space-y-4">
              {filtered.map((h) => (
                <li key={h.id} className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium capitalize">{h.type}</span> — {h.description}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ----- DOCUMENTS TAB -----
function DocumentsTab({ clientId, canEdit }: { clientId: string; canEdit: boolean }) {
  const [uploading, setUploading] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const { data: files = [] } = useQuery({
    queryKey: ["client-documents", clientId, refresh],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("client-documents")
        .list(clientId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return data ?? [];
    },
  });

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${clientId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("client-documents").upload(path, file);
    setUploading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Arquivo enviado");
      setRefresh((r) => r + 1);
    }
    e.target.value = "";
  };

  const getUrl = async (name: string) => {
    const { data } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(`${clientId}/${name}`, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Documentos do cliente</CardTitle>
        {canEdit && (
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <Button asChild size="sm" disabled={uploading}>
              <span>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                Enviar arquivo
              </span>
            </Button>
            <input type="file" className="hidden" onChange={onUpload} />
          </label>
        )}
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento.</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {files.filter((f) => f.name !== ".emptyFolderPlaceholder").map((f) => (
              <li key={f.id || f.name} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{f.name}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => getUrl(f.name)}>
                  Abrir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
