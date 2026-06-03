import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Mail,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ROLE_LABELS, type AppRole, ROLE_PRECEDENCE } from "@/types";
import { deleteAuthUser, setUserActive } from "@/lib/admin-users.functions";
import {
  createInvite,
  resendInvite,
  revokeInvite,
} from "@/lib/invites.functions";
import { changeUserRole } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Usuários — MTX Hub" }] }),
  component: UsersPage,
});

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: "Acesso total ao sistema",
  admin: "Acesso quase total, sem configurações críticas",
  comercial: "Acesso ao CRM e módulo comercial",
  jovem_aprendiz: "Acesso apenas às próprias tarefas e trilha",
  cliente: "Acesso apenas ao portal do cliente",
};

function buildInviteUrl(token: string) {
  if (typeof window === "undefined") return `/convite/${token}`;
  return `${window.location.origin}/convite/${token}`;
}

function UsersPage() {
  const { isAdmin, isSuperAdmin, loading: permLoading } = usePermissions();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const deleteFn = useServerFn(deleteAuthUser);
  const activeFn = useServerFn(setUserActive);
  const createInviteFn = useServerFn(createInvite);
  const resendInviteFn = useServerFn(resendInvite);
  const revokeInviteFn = useServerFn(revokeInvite);

  const [pendingChange, setPendingChange] = useState<{
    userId: string;
    fullName: string;
    currentRole: AppRole | null;
    newRole: AppRole;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    userId: string;
    fullName: string;
  } | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<{
    id: string;
    email: string;
  } | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("jovem_aprendiz");

  const [linkDialog, setLinkDialog] = useState<{
    email: string;
    url: string;
  } | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["all-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const roleMap = new Map<string, AppRole[]>();
      (roles ?? []).forEach((r) => {
        const list = roleMap.get(r.user_id) ?? [];
        list.push(r.role as AppRole);
        roleMap.set(r.user_id, list);
      });

      return (profiles ?? []).map((p) => {
        const userRoles = roleMap.get(p.id) ?? [];
        const primary = ROLE_PRECEDENCE.find((r) => userRoles.includes(r)) ?? null;
        return { ...p, role: primary };
      });
    },
  });

  const { data: invites } = useQuery({
    queryKey: ["user-invites"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_invites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error: delErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });
      if (insErr) throw insErr;
      await supabase.from("activity_logs").insert({
        user_id: currentUser?.id ?? null,
        action: "role_changed",
        entity_type: "user",
        entity_id: userId,
        description: `Permissão alterada para ${ROLE_LABELS[newRole]}`,
      });
    },
    onSuccess: () => {
      toast.success("Permissão atualizada");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setPendingChange(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao alterar permissão");
      setPendingChange(null);
    },
  });

  const toggleActive = useMutation({
    mutationFn: (args: { userId: string; active: boolean }) =>
      activeFn({ data: args }),
    onSuccess: (_d, vars) => {
      toast.success(vars.active ? "Usuário ativado" : "Usuário desativado");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao atualizar status"),
  });

  const removeUser = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Usuário excluído");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setPendingDelete(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao excluir");
      setPendingDelete(null);
    },
  });

  const sendInvite = useMutation({
    mutationFn: () =>
      createInviteFn({
        data: {
          email: inviteEmail.trim(),
          fullName: inviteName.trim(),
          role: inviteRole,
        },
      }),
    onSuccess: ({ invite }) => {
      toast.success(`Convite criado para ${invite.email}`);
      queryClient.invalidateQueries({ queryKey: ["user-invites"] });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("jovem_aprendiz");
      setLinkDialog({ email: invite.email, url: buildInviteUrl(invite.token) });
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao criar convite"),
  });

  const resend = useMutation({
    mutationFn: (id: string) => resendInviteFn({ data: { inviteId: id } }),
    onSuccess: ({ invite }) => {
      toast.success("Convite reenviado");
      queryClient.invalidateQueries({ queryKey: ["user-invites"] });
      setLinkDialog({ email: invite.email, url: buildInviteUrl(invite.token) });
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao reenviar"),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeInviteFn({ data: { inviteId: id } }),
    onSuccess: () => {
      toast.success("Convite revogado");
      queryClient.invalidateQueries({ queryKey: ["user-invites"] });
      setPendingRevoke(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao revogar");
      setPendingRevoke(null);
    },
  });

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(buildInviteUrl(token));
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  if (permLoading) return null;
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Acesso negado</h2>
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  const inviteStatus = (inv: {
    used: boolean;
    expires_at: string;
  }): { label: string; className: string } => {
    if (inv.used)
      return { label: "Utilizado", className: "bg-success/15 text-success" };
    if (new Date(inv.expires_at).getTime() < Date.now())
      return {
        label: "Expirado",
        className: "bg-destructive/15 text-destructive",
      };
    return { label: "Pendente", className: "bg-amber-500/15 text-amber-500" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Usuários e Permissões
            </h2>
            <p className="text-sm text-muted-foreground">
              Gestão de acessos do MTX Hub
            </p>
          </div>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Convidar usuário
          </Button>
        )}
      </div>

      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último acesso</TableHead>
                {isSuperAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (users?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center text-muted-foreground">
                    Nenhum usuário cadastrado ainda.
                  </TableCell>
                </TableRow>
              )}
              {users?.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const canEdit = isSuperAdmin && !isSelf;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select
                          value={u.role ?? ""}
                          onValueChange={(value) =>
                            setPendingChange({
                              userId: u.id,
                              fullName: u.full_name ?? u.email ?? "usuário",
                              currentRole: u.role,
                              newRole: value as AppRole,
                            })
                          }
                          disabled={changeRole.isPending}
                        >
                          <SelectTrigger className="h-8 w-[170px] border-primary/40 text-primary">
                            <SelectValue placeholder="Sem papel" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_PRECEDENCE.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          {u.role ? ROLE_LABELS[u.role] : "Sem papel"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={u.is_active}
                            onCheckedChange={(checked) =>
                              toggleActive.mutate({ userId: u.id, active: checked })
                            }
                            disabled={toggleActive.isPending}
                          />
                          <span className="text-xs text-muted-foreground">
                            {u.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      ) : u.is_active ? (
                        <Badge className="bg-success/15 text-success hover:bg-success/20">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString("pt-BR")
                        : "—"}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        {!isSelf && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setPendingDelete({
                                userId: u.id,
                                fullName: u.full_name ?? u.email ?? "usuário",
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending invites */}
      {isSuperAdmin && (
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Convites pendentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invites?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhum convite enviado ainda.
                    </TableCell>
                  </TableRow>
                )}
                {invites?.map((inv) => {
                  const status = inviteStatus(inv);
                  const isPending = status.label === "Pendente";
                  const canResend = !inv.used;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          {ROLE_LABELS[inv.role as AppRole]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inv.expires_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge className={status.className}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {isPending && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copyLink(inv.token)}
                            title="Copiar link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {canResend && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => resend.mutate(inv.id)}
                            disabled={resend.isPending}
                            title="Reenviar"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            setPendingRevoke({ id: inv.id, email: inv.email })
                          }
                          title="Excluir convite"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Confirm role change */}
      <ConfirmDialog
        open={!!pendingChange}
        onOpenChange={(open) => !open && setPendingChange(null)}
        title="Alterar permissão"
        description={
          pendingChange ? (
            <>
              Confirma alterar a permissão de <strong>{pendingChange.fullName}</strong> de{" "}
              <strong>{pendingChange.currentRole ? ROLE_LABELS[pendingChange.currentRole] : "Sem papel"}</strong>{" "}
              para <strong>{ROLE_LABELS[pendingChange.newRole]}</strong>?
            </>
          ) : null
        }
        confirmLabel="Alterar permissão"
        loading={changeRole.isPending}
        onConfirm={() =>
          pendingChange &&
          changeRole.mutate({
            userId: pendingChange.userId,
            newRole: pendingChange.newRole,
          })
        }
      />

      {/* Confirm delete user */}
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Excluir usuário"
        description={
          pendingDelete ? (
            <>
              Esta ação remove <strong>{pendingDelete.fullName}</strong> do sistema, incluindo
              acesso, perfil e permissões. Não pode ser desfeita.
            </>
          ) : null
        }
        confirmLabel="Excluir usuário"
        variant="destructive"
        loading={removeUser.isPending}
        onConfirm={() => pendingDelete && removeUser.mutate(pendingDelete.userId)}
      />

      {/* Confirm revoke invite */}
      <ConfirmDialog
        open={!!pendingRevoke}
        onOpenChange={(open) => !open && setPendingRevoke(null)}
        title="Revogar convite"
        description={
          pendingRevoke ? (
            <>
              O convite de <strong>{pendingRevoke.email}</strong> será invalidado e
              o link não poderá mais ser usado.
            </>
          ) : null
        }
        confirmLabel="Revogar"
        variant="destructive"
        loading={revoke.isPending}
        onConfirm={() => pendingRevoke && revoke.mutate(pendingRevoke.id)}
      />

      {/* Invite user */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Convidar usuário
            </DialogTitle>
            <DialogDescription>
              O convidado receberá um link único, válido por 48 horas, para
              definir a senha e acessar o MTX Hub.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nome completo</Label>
              <Input
                id="invite-name"
                placeholder="Nome completo"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="pessoa@empresa.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil de acesso</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_PRECEDENCE.map((r) => (
                    <SelectItem key={r} value={r}>
                      <div className="flex flex-col">
                        <span>{ROLE_LABELS[r]}</span>
                        <span className="text-xs text-muted-foreground">
                          {ROLE_DESCRIPTIONS[r]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => sendInvite.mutate()}
              disabled={
                !inviteEmail.trim() ||
                !inviteName.trim() ||
                sendInvite.isPending
              }
            >
              Enviar convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link generated dialog */}
      <Dialog
        open={!!linkDialog}
        onOpenChange={(open) => !open && setLinkDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convite criado</DialogTitle>
            <DialogDescription>
              Convite enviado para <strong>{linkDialog?.email}</strong>. Este link
              expira em 48 horas. Caso prefira enviar manualmente, copie abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input value={linkDialog?.url ?? ""} readOnly className="font-mono text-xs" />
            <Button
              size="icon"
              variant="outline"
              onClick={async () => {
                if (!linkDialog) return;
                try {
                  await navigator.clipboard.writeText(linkDialog.url);
                  toast.success("Link copiado");
                } catch {
                  toast.error("Não foi possível copiar");
                }
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setLinkDialog(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
