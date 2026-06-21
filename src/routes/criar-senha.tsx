import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Loader2, AlertCircle, Check, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { setUserPassword } from "@/lib/password.functions";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/hooks/useAuth";

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

// Password strength rules for real-time feedback
const PASSWORD_RULES = [
  { label: "No mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Pelo menos uma letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { label: "Pelo menos uma letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Pelo menos um número", test: (p: string) => /[0-9]/.test(p) },
  { label: "Pelo menos um caractere especial (@, !, #, $, etc.)", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

/**
 * Traduz mensagens de erro do Supabase Auth para português,
 * cobrindo todos os cenários conhecidos de rejeição de senha.
 */
function translatePasswordError(message: string): string {
  const msg = message.toLowerCase();

  // Senha igual à anterior ou provisória
  if (msg.includes("different from the old password") || msg.includes("same as") || msg.includes("should be different") || msg.includes("previously used")) {
    return "A nova senha não pode ser igual à sua senha anterior (ou provisória). Por favor, escolha uma senha diferente.";
  }

  // Senha encontrada em vazamentos de dados (HIBP check)
  if (msg.includes("pwned") || msg.includes("breach") || msg.includes("leaked") || msg.includes("compromised") || msg.includes("common")) {
    return "Esta senha foi encontrada em vazamentos de dados conhecidos e não é segura. Por favor, escolha uma senha diferente e única que você não usa em outros sites.";
  }

  // Senha muito fraca ou curta
  if (msg.includes("weak") || msg.includes("too short") || msg.includes("too simple")) {
    return "A senha é muito fraca. Use uma combinação mais forte com letras maiúsculas, minúsculas, números e caracteres especiais.";
  }

  // Requisitos de complexidade do servidor
  if (msg.includes("password should contain") || msg.includes("must contain") || msg.includes("required_characters")) {
    return "A senha não atende aos requisitos de segurança do servidor. Use pelo menos 8 caracteres com letras maiúsculas, minúsculas, números e caracteres especiais (ex: @, #, !).";
  }

  // Senha muito longa
  if (msg.includes("too long") || msg.includes("maximum")) {
    return "A senha é muito longa. Use no máximo 128 caracteres.";
  }

  // Sessão expirada ou token inválido
  if (msg.includes("session") || msg.includes("token") || msg.includes("expired") || msg.includes("invalid") || msg.includes("refresh")) {
    return "Sua sessão expirou. Por favor, solicite um novo link de acesso ao administrador.";
  }

  // Rate limit
  if (msg.includes("rate") || msg.includes("too many") || msg.includes("limit")) {
    return "Muitas tentativas em sequência. Aguarde alguns segundos e tente novamente.";
  }

  // Fallback — mostra o erro original com contexto em português
  return `O servidor rejeitou a senha: "${message}". Tente usar uma senha diferente com mais variedade de caracteres.`;
}

export const Route = createFileRoute("/criar-senha")({
  head: () => ({ meta: [{ title: "Criar senha — MTX Hub" }] }),
  component: CreatePasswordPage,
});

function CreatePasswordPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const passwordValue = watch("password") ?? "";

  const onSubmit = async ({ password }: FormValues) => {
    setLoading(true);
    try {
      await setUserPassword({ data: { password } });
    } catch (err: any) {
      setLoading(false);
      const msg = translatePasswordError(err?.message ?? "Erro desconhecido");
      toast.error("Não foi possível salvar a senha", { description: msg, duration: 8000 });
      return;
    }
    setLoading(false);

    // Ensure profiles.full_name is populated from the application form
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (!profile?.full_name) {
          const { data: app } = await supabase
            .from("young_applications")
            .select("full_name")
            .eq("email", user.email!)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const name = app?.full_name
            || user.user_metadata?.full_name
            || null;

          if (name) {
            await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
          }
        }
      }
    } catch {
      // Non-critical — don't block the user from proceeding
    }

    toast.success("Senha criada com sucesso!");
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

  const allRulesMet = PASSWORD_RULES.every((r) => r.test(passwordValue));

  return (
    <AuthLayout title="Criar sua senha" subtitle="Defina uma senha para acessar o MTX Hub">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5 text-sm bg-muted/50 p-3 rounded-md mb-4 border border-border/50">
           <p className="font-semibold text-foreground mb-2">Sua senha deve conter:</p>
           <ul className="space-y-1">
             {PASSWORD_RULES.map((rule, i) => {
               const met = passwordValue.length > 0 && rule.test(passwordValue);
               return (
                 <li key={i} className={`flex items-center gap-2 text-xs ${met ? "text-green-600" : "text-muted-foreground"}`}>
                   {passwordValue.length > 0 ? (
                     met ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-destructive" />
                   ) : (
                     <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 inline-block" />
                   )}
                   {rule.label}
                 </li>
               );
             })}
           </ul>
        </div>
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
        <Button type="submit" className="w-full bg-[#10b981] hover:bg-[#0da06f] text-white" disabled={loading || !allRulesMet}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar senha e acessar
        </Button>
      </form>
    </AuthLayout>
  );
}
