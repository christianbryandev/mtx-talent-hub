import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});
type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — MTX Hub" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setLoading(false);
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }

    // Block inactive users
    const userId = data.user?.id;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", userId)
        .maybeSingle();
      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        setLoading(false);
        toast.error("Acesso bloqueado", {
          description: "Sua conta está desativada. Procure um administrador.",
        });
        return;
      }
    }

    setLoading(false);
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard" });
  };

  return (
    <AuthLayout
      title="Entrar no MTX Hub"
      subtitle="Acesse sua conta para continuar"
      footer={
        <span className="text-muted-foreground">
          Esqueceu sua senha?{" "}
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Recuperar acesso
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="voce@mtx.com.br" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <PasswordInput id="password" autoComplete="current-password" placeholder="••••••••" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
