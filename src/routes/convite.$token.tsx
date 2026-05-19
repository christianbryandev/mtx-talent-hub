import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvite } from "@/lib/invites.functions";
import { ROLE_LABELS, type AppRole } from "@/types";

export const Route = createFileRoute("/convite/$token")({
  head: () => ({ meta: [{ title: "Convite — MTX Hub" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const acceptFn = useServerFn(acceptInvite);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_invite_by_token", {
        _token: token,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row ?? null;
    },
  });

  if (isLoading) {
    return (
      <AuthLayout title="Verificando convite..." subtitle="Aguarde um instante">
        <div className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (!data) {
    return (
      <AuthLayout
        title="Convite inválido"
        subtitle="Este link de convite é inválido ou já expirou."
      >
        <p className="text-sm text-muted-foreground">
          Entre em contato com o administrador do sistema para receber um novo
          convite.
        </p>
      </AuthLayout>
    );
  }

  if (data.used) {
    return (
      <AuthLayout
        title="Convite já utilizado"
        subtitle="Este convite já foi utilizado. Se você já tem uma conta, acesse o sistema normalmente."
      >
        <Button asChild className="w-full">
          <Link to="/login">Ir para o login</Link>
        </Button>
      </AuthLayout>
    );
  }

  const expired = new Date(data.expires_at).getTime() < Date.now();
  if (expired) {
    return (
      <AuthLayout
        title="Convite expirado"
        subtitle="Este link de convite é inválido ou já expirou."
      >
        <p className="text-sm text-muted-foreground">
          Entre em contato com o administrador do sistema para receber um novo
          convite.
        </p>
      </AuthLayout>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha precisa ter ao menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSubmitting(true);
    try {
      await acceptFn({ data: { token, password } });
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password,
      });
      if (signInErr) throw signInErr;
      toast.success("Conta criada! Bem-vindo ao MTX Hub.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error("Não foi possível criar a conta", {
        description: (err as Error).message,
      });
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Você foi convidado para o MTX Hub!"
      subtitle={`Olá, ${data.full_name.split(" ")[0]}! Você foi convidado para acessar o sistema da MTX com o perfil de ${ROLE_LABELS[data.role as AppRole]}. Defina sua senha para começar.`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input value={data.email} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha (mínimo 8 caracteres)</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar minha conta
        </Button>
      </form>
    </AuthLayout>
  );
}
