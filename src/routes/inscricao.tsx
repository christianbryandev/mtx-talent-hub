import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, CheckCircle2, User, Mail, Phone, ArrowRight } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const applicationSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Telefone inválido (mínimo 10 dígitos)"),
});

type ApplicationValues = z.infer<typeof applicationSchema>;

export const Route = createFileRoute("/inscricao")({
  head: () => ({
    meta: [
      { title: "Inscrição — MTX Multiplicando Talentos" },
      { name: "description", content: "Cadastre-se na MTX e comece sua trilha de transformação." },
    ],
  }),
  component: PublicApplicationPage,
});

function PublicApplicationPage() {
  const [done, setDone] = useState(false);

  const form = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const submit = useMutation({
    mutationFn: async (values: ApplicationValues) => {
      const { error } = await supabase.from("applications").insert({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => {
      console.error("Erro ao enviar inscrição:", e);
      toast.error("Ocorreu um erro ao enviar sua inscrição. Tente novamente.");
    },
  });

  if (done) {
    return (
      <div className="min-h-screen bg-background grid place-items-center px-4 py-10">
        <Card className="max-w-lg w-full p-10 text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Inscrição enviada!</h1>
            <p className="text-muted-foreground text-lg">
              Sua candidatura foi recebida com sucesso e está em análise.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-left">
            <p className="font-medium mb-1">O que acontece agora?</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Nossa equipe revisará seus dados</li>
              <li>Se aprovado, você receberá um link de acesso por e-mail</li>
              <li>Fique atento(a) às suas notificações</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">— Equipe MTX • Multiplicando Talentos</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sparkles className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">MTX • Multiplicando Talentos</h1>
            <p className="text-muted-foreground font-medium">Inicie sua jornada de evolução</p>
          </div>
        </div>

        <Card className="border-border/50 shadow-xl shadow-black/5">
          <CardHeader>
            <CardTitle>Inscrição</CardTitle>
            <CardDescription>
              Preencha os campos abaixo para solicitar seu acesso à plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Seu nome" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="email" placeholder="seu@email.com" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Celular / WhatsApp</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="(00) 00000-0000" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-11 font-bold" 
                  disabled={submit.isPending}
                >
                  {submit.isPending ? "Enviando..." : (
                    <>
                      Enviar Inscrição <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Ao se inscrever, você concorda com nossa política de privacidade.
        </p>
      </div>
    </div>
  );
}
