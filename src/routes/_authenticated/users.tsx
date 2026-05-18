import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ROLE_LABELS, type AppRole, ROLE_PRECEDENCE } from "@/types";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Usuários — MTX Hub" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { isAdmin, isSuperAdmin, loading: permLoading } = usePermissions();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [pendingChange, setPendingChange] = useState<{
    userId: string;
    fullName: string;
    currentRole: AppRole | null;
    newRole: AppRole;
  } | null>(null);

  const { data, isLoading } = useQuery({
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

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // Remove all existing roles, then add the new one (single-role model)
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
      toast.success("Permissão atualizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setPendingChange(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao alterar permissão");
      setPendingChange(null);
    },
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Usuários e Permissões</h2>
          <p className="text-sm text-muted-foreground">
            Gestão de acessos do MTX Hub
          </p>
        </div>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum usuário cadastrado ainda.
                  </TableCell>
                </TableRow>
              )}
              {data?.map((u) => {
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
                      {u.is_active ? (
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <p className="text-xs text-muted-foreground">
          Clique no perfil de um usuário para alterar a permissão. A mudança é aplicada imediatamente.
        </p>
      )}

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
    </div>
  );
}
