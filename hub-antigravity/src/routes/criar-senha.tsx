import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/hooks/useAuth";

const schema = z
  .object({
    password: z.string()
      .min(6, "A senha deve ter no mínimo 6 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "As senhas não coincidem",
  });
type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/criar-senha")({
  head: () => ({ meta: [{ title: "Criar senha — MTX Hub" }] }),
  component: CreatePasswordPage,
});

function CreatePasswordPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ password }: FormValues) => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    
    if (error) {
      toast.error("Não foi possível salvar a senha", { description: error.message });
      return;
    }
    
    toast.success("Senha criada com sucesso!");
    // Redireciona para o dashboard (painel)
    navigate({ to: "/dashboard" });
  };

  if (authLoading) {
    return (
      <AuthLayout title="Criar sua senha" subtitle="Verificando seu link de acesso...">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (!session) {
    return (
      <AuthLayout title="Link Expirado ou Inválido" subtitle="Não foi possível identificar sua sessão.">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 flex flex-col items-center text-center space-y-3">
          <AlertCircle className="h-10 w-10" />
          <p className="text-sm font-medium">
            Seu link de acesso parece ter expirado, já foi utilizado ou você o abriu em um navegador incompatível (como o navegador embutido do Gmail ou Instagram).
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Por favor, solicite um novo link ao administrador e certifique-se de abri-lo diretamente no Safari ou Google Chrome.
          </p>
        </div>
        <Button 
          variant="outline" 
          className="w-full mt-6" 
          onClick={() => navigate({ to: "/" })}
        >
          Voltar para o Login
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Criar sua senha" subtitle="Defina uma senha para acessar o MTX Hub">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <PasswordInput 
            id="password" 
            autoComplete="new-password" 
            placeholder="Mínimo 8 caracteres"
            {...register("password")} 
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <PasswordInput 
            id="confirm" 
            autoComplete="new-password" 
            placeholder="Repita a nova senha"
            {...register("confirm")} 
          />
          {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
        </div>
        <Button type="submit" className="w-full bg-[#10b981] hover:bg-[#0da06f] text-white" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar senha e acessar
        </Button>
      </form>
    </AuthLayout>
  );
}
