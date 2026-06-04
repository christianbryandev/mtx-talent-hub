import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

const schema = z
  .object({
    password: z.string()
      .min(8, "A senha deve ter no mínimo 8 caracteres")
      .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
      .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
      .regex(/[0-9]/, "Deve conter pelo menos um número")
      .regex(/[^a-zA-Z0-9]/, "Deve conter pelo menos um caractere especial (ex: @, !, #)"),
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
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    console.log("Página de criação de senha carregada");
    // O Supabase lida automaticamente com o token na URL ao carregar a página se estiver configurado corretamente
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Sessão atual no criar-senha:", session ? "Sim" : "Não");
    });
  }, []);

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

  return (
    <AuthLayout title="Criar sua senha" subtitle="Defina uma senha para acessar o MTX Hub">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md mb-4 border border-border/50">
           <p className="font-semibold text-foreground mb-1">Sua senha deve conter:</p>
           <ul className="list-disc pl-5 space-y-0.5">
             <li>No mínimo 8 caracteres</li>
             <li>Pelo menos uma letra maiúscula e uma minúscula</li>
             <li>Pelo menos um número</li>
             <li>Pelo menos um caractere especial (ex: @, !, #, $)</li>
           </ul>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <PasswordInput 
            id="password" 
            autoComplete="new-password" 
            placeholder="Mínimo 6 caracteres"
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
