import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, AlertCircle, ShieldCheck, User, Lock, Mail, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

const signupSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação de senha obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type SignupValues = z.infer<typeof signupSchema>;

export const Route = createFileRoute("/registro")({
  head: () => ({ meta: [{ title: "Criar Conta — MTX Hub" }] }),
  component: RegistrationPage,
});

function RegistrationPage() {
  const navigate = useNavigate();
  const search = Route.useSearch() as { token?: string };
  const [validating, setValidating] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    async function validateToken() {
      if (!search.token) {
        setError("Token de convite não fornecido.");
        setValidating(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("invites")
          .select("*")
          .eq("token", search.token)
          .single();

        if (fetchError || !data) {
          setError("Convite inválido ou não encontrado.");
        } else if (data.is_used) {
          setError("Este convite já foi utilizado.");
        } else {
          setInvite(data);
        }
      } catch (err) {
        setError("Erro ao validar convite.");
      } finally {
        setValidating(false);
      }
    }

    validateToken();
  }, [search.token]);

  const onSubmit = async (values: SignupValues) => {
    if (!invite) return;
    setLoading(true);

    try {
      // 1. Create auth user
      const { data, error: signupError } = await supabase.auth.signUp({
        email: invite.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          },
        },
      });

      if (signupError) throw signupError;

      // 2. Mark invite as used
      const { error: updateError } = await supabase
        .from("invites")
        .update({ is_used: true })
        .eq("id", invite.id);

      if (updateError) {
        console.error("Erro ao queimar convite:", updateError);
        // We don't throw here because the user is already created
      }

      toast.success("Conta criada com sucesso!", {
        description: "Você já pode acessar a plataforma.",
      });

      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error("Erro ao criar conta", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <AuthLayout title="Validando convite" subtitle="Aguarde um momento...">
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (error) {
    return (
      <AuthLayout title="Acesso Bloqueado" subtitle="Convite inválido ou expirado">
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro de Validação</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Para participar do MTX Hub, você precisa ser aprovado em nosso processo de seleção.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/inscricao">Ir para área de inscrição</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Concluir Cadastro" 
      subtitle={`Bem-vindo(a)! Complete seus dados para acessar o hub.`}
    >
      <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/10 flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">E-mail verificado</p>
          <p className="text-sm font-medium truncate text-foreground">{invite.email}</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              id="fullName" 
              placeholder="Como quer ser chamado?" 
              className="pl-10"
              {...form.register("fullName")} 
            />
          </div>
          {form.formState.errors.fullName && (
            <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Criar Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <PasswordInput 
              id="password" 
              placeholder="••••••••" 
              className="pl-10"
              {...form.register("password")} 
            />
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <PasswordInput 
              id="confirmPassword" 
              placeholder="••••••••" 
              className="pl-10"
              {...form.register("confirmPassword")} 
            />
          </div>
          {form.formState.errors.confirmPassword && (
            <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full h-11 font-bold" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando conta...
            </>
          ) : (
            <>
              Finalizar Cadastro <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
      
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Ao criar sua conta, você terá acesso imediato à trilha de evolução da MTX.
      </p>
    </AuthLayout>
  );
}