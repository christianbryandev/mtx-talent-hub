import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, X, Loader2, Trash2, Edit, Plus, Trash } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createInvite } from "@/lib/invites.functions";
import {
  APPLICATION_STATUS_LABELS,
  TRAIL_PHASE_LABELS,
  TRAIL_PHASE_LIST,
  type YoungApplication,
  type ApplicationStatus,
  type TrailPhase,
} from "@/types";

export const Route = createFileRoute("/_authenticated/jovens/inscricoes")({
  head: () => ({ meta: [{ title: "Inscrições — MTX Hub" }] }),
  component: InscricoesPage,
});

const STATUS_VARIANTS: Record<ApplicationStatus, string> = {
  pendente: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  em_analise: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  aprovado: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  reprovado: "bg-red-500/15 text-red-400 border-red-500/30",
};

function InscricoesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: permissionsLoading } = usePermissions();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detail, setDetail] = useState<YoungApplication | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<YoungApplication | null>(null);
  const [complement, setComplement] = useState<{ youngId: string; app: YoungApplication } | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const createInviteFn = useServerFn(createInvite);

  useEffect(() => {
    if (!permissionsLoading && !isAdmin) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isAdmin, navigate, permissionsLoading]);

  if (permissionsLoading || !isAdmin) {
    return <div className="h-24 animate-pulse rounded-md bg-primary/5" />;
  }

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["young_applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("young_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as YoungApplication[];
    },
  });

  const filtered = apps.filter((a) => statusFilter === "all" || a.status === statusFilter);

  const updateStatus = useMutation({
    mutationFn: async ({ appId, status }: { appId: string; status: ApplicationStatus }) => {
      const { error } = await supabase.from("young_applications").update({ status }).eq("id", appId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["young_applications"] });
      qc.invalidateQueries({ queryKey: ["pending-applications-count"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async (app: YoungApplication) => {
      const { data, error } = await supabase.functions.invoke("send-approval-email", {
        body: { 
          candidato_id: app.id, 
          email: app.email, 
          nome: app.full_name 
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return { app };
    },
    onSuccess: ({ app }) => {
      toast.success("Candidato aprovado e e-mail enviado! ✅");
      qc.invalidateQueries({ queryKey: ["young_applications"] });
      qc.invalidateQueries({ queryKey: ["pending-applications-count"] });
      setDetail(null);
    },
    onError: (e: Error) => {
      console.error("Erro na aprovação:", e);
      toast.error("Erro ao aprovar candidato. Tente novamente.");
    },
  });

  const deleteApp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("young_applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição excluída");
      qc.invalidateQueries({ queryKey: ["young_applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAllApps = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("young_applications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Todas as inscrições foram excluídas");
      qc.invalidateQueries({ queryKey: ["young_applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveApp = useMutation({
    mutationFn: async (values: Partial<YoungApplication>) => {
      if (editingApp) {
        const { error } = await supabase.from("young_applications").update(values).eq("id", editingApp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("young_applications").insert([{ ...values, status: "pendente" } as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingApp ? "Inscrição atualizada" : "Inscrição criada");
      setIsFormOpen(false);
      setEditingApp(null);
      qc.invalidateQueries({ queryKey: ["young_applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/jovens"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inscrições recebidas</h1>
            <p className="text-sm text-muted-foreground">Candidatos enviados pelo formulário público</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="hidden sm:flex"
            onClick={() => {
              setEditingApp(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
                <Trash className="mr-2 h-4 w-4" /> Apagar Tudo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação excluirá permanentemente todas as inscrições recebidas. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteAllApps.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir Tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_analise">Em análise</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="reprovado">Reprovado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Nenhuma inscrição encontrada
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => setDetail(a)}>
                  <TableCell className="font-medium">{a.full_name}</TableCell>
                  <TableCell>{a.age ?? "—"}</TableCell>
                  <TableCell>{a.city ?? "—"}</TableCell>
                  <TableCell>{a.interest_area ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_VARIANTS[a.status]}>
                      {APPLICATION_STATUS_LABELS[a.status]}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingApp(a);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir inscrição?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Deseja realmente excluir a inscrição de <b>{a.full_name}</b>?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteApp.mutate(a.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <div className="flex gap-1">
                        {a.status === "aprovado" ? (
                          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                            Aprovado
                          </Badge>
                        ) : (
                          <div className="flex gap-1">
                            {a.status === "pendente" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatus.mutate({ appId: a.id, status: "em_analise" })}
                              >
                                Analisar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => approve.mutate(a)}
                              disabled={approve.isPending && approve.variables?.id === a.id}
                            >
                              {approve.isPending && approve.variables?.id === a.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Aprovar"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(o) => {
        setIsFormOpen(o);
        if (!o) setEditingApp(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingApp ? "Editar Inscrição" : "Adicionar Inscrição"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const values = Object.fromEntries(formData.entries());
            saveApp.mutate(values as any);
          }} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input id="full_name" name="full_name" defaultValue={editingApp?.full_name} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={editingApp?.email || ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" defaultValue={editingApp?.whatsapp || ""} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" name="city" defaultValue={editingApp?.city || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Idade</Label>
                <Input id="age" name="age" type="number" defaultValue={editingApp?.age || ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interest_area">Área de Interesse</Label>
              <Input id="interest_area" name="interest_area" defaultValue={editingApp?.interest_area || ""} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveApp.isPending}>
                {saveApp.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingApp ? "Salvar Alterações" : "Criar Inscrição"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.full_name}</DialogTitle>
                <Badge variant="outline" className={`w-fit ${STATUS_VARIANTS[detail.status]}`}>
                  {APPLICATION_STATUS_LABELS[detail.status]}
                </Badge>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                <Detail label="Idade" value={detail.age} />
                <Detail label="WhatsApp" value={detail.whatsapp} />
                <Detail label="E-mail" value={detail.email} />
                <Detail label="Telefone" value={detail.phone} />
                <Detail label="Cidade" value={detail.city} />
                <Detail label="Estado" value={detail.state} />
                <Detail label="Escolaridade" value={detail.education_level} />
                <Detail label="Renda familiar" value={detail.family_income} />
                <Detail label="Estuda?" value={detail.currently_studying ? "Sim" : "Não"} />
                <Detail label="Trabalha?" value={detail.currently_working ? "Sim" : "Não"} />
                <Detail label="Área de interesse" value={detail.interest_area} />
                <Detail label="Como conheceu" value={detail.how_found_mtx} />
                <Detail label="Laptop" value={detail.has_laptop ? "Sim" : "Não"} />
                <Detail label="Celular" value={detail.has_phone ? "Sim" : "Não"} />
                <Detail label="Internet" value={detail.has_internet ? "Sim" : "Não"} />
                <div className="sm:col-span-2"><Detail label="História" value={detail.personal_story} /></div>
                <div className="sm:col-span-2"><Detail label="Sonhos" value={detail.dreams} /></div>
                <div className="sm:col-span-2"><Detail label="Por que MTX?" value={detail.why_mtx} /></div>
                <div className="sm:col-span-2"><Detail label="Habilidades" value={detail.perceived_skills} /></div>
              </div>
              <DialogFooter className="flex-wrap gap-2 sm:justify-between">
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => updateStatus.mutate({ appId: detail.id, status: "reprovado" })}
                  disabled={detail.status === "reprovado"}
                >
                  <X className="mr-1.5 h-4 w-4" /> Reprovar
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => updateStatus.mutate({ appId: detail.id, status: "em_analise" })}
                    disabled={detail.status === "em_analise"}
                  >
                    Em análise
                  </Button>
                  <Button
                    onClick={() => approve.mutate(detail)}
                    disabled={detail.status === "aprovado" || approve.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {approve.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 h-4 w-4" />
                    )}
                    {approve.isPending ? "Aprovando..." : "Aprovar"}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ComplementModal
        state={complement}
        onClose={() => setComplement(null)}
        onSentInvite={(link) => setInviteLink(link)}
        createInviteFn={createInviteFn}
        navigate={navigate}
        qc={qc}
      />

      <Dialog open={!!inviteLink} onOpenChange={(o) => !o && setInviteLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convite gerado</DialogTitle>
            <DialogDescription>
              Copie e envie o link abaixo manualmente para o(a) jovem.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={inviteLink ?? ""} />
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                if (inviteLink) {
                  navigator.clipboard.writeText(inviteLink);
                  toast.success("Link copiado!");
                }
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ComplementState {
  youngId: string;
  app: YoungApplication;
}

function ComplementModal({
  state,
  onClose,
  onSentInvite,
  createInviteFn,
  navigate,
  qc,
}: {
  state: ComplementState | null;
  onClose: () => void;
  onSentInvite: (link: string) => void;
  createInviteFn: ReturnType<typeof useServerFn<typeof createInvite>>;
  navigate: ReturnType<typeof useNavigate>;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [mentorId, setMentorId] = useState("");
  const [phase, setPhase] = useState<TrailPhase>("fase_1");
  const [observations, setObservations] = useState("");
  const [sendInvite, setSendInvite] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: mentors = [] } = useQuery({
    queryKey: ["mentors-min"],
    enabled: !!state,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true);
      return data ?? [];
    },
  });

  const handleSave = async (goToProfile: boolean) => {
    if (!state) return;
    setSaving(true);
    try {
      await supabase
        .from("young_people")
        .update({
          mentor_id: mentorId || null,
          trail_phase: phase,
          observations: observations || null,
        })
        .eq("id", state.youngId);

      if (sendInvite && state.app.email) {
        const res = await createInviteFn({
          data: {
            email: state.app.email,
            fullName: state.app.full_name,
            role: "jovem_aprendiz",
          },
        });
        const token = (res as { invite: { token: string } }).invite.token;
        const link = `${window.location.origin}/convite/${token}`;
        onSentInvite(link);
      }

      qc.invalidateQueries({ queryKey: ["young_people"] });
      toast.success("Perfil complementado!");
      onClose();
      if (goToProfile) navigate({ to: "/jovens/$id", params: { id: state.youngId } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complementar perfil</DialogTitle>
          <DialogDescription>
            Adicione informações que não vieram no formulário de inscrição.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Mentor responsável</Label>
            <Select value={mentorId} onValueChange={setMentorId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {mentors.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name ?? m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fase da trilha</Label>
            <Select value={phase} onValueChange={(v) => setPhase(v as TrailPhase)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRAIL_PHASE_LIST.map((p) => (
                  <SelectItem key={p} value={p}>{TRAIL_PHASE_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações iniciais</Label>
            <Textarea rows={3} value={observations} onChange={(e) => setObservations(e.target.value)} />
          </div>
          {state?.app.email && (
            <label className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <Checkbox checked={sendInvite} onCheckedChange={(c) => setSendInvite(!!c)} className="mt-0.5" />
              <span>
                Enviar convite de acesso ao sistema para <b>{state.app.email}</b>
              </span>
            </label>
          )}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            Salvar e completar depois
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            Completar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap">{value || "—"}</div>
    </div>
  );
}
