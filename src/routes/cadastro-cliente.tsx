import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  User, 
  Mail, 
  MessageSquare,
  Briefcase
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const leadSchema = z.object({
  company_name: z.string().min(2, "Razão social é obrigatória"),
  trade_name: z.string().optional(),
  contact_name: z.string().min(2, "Nome do responsável é obrigatório"),
  email: z.string().email("E-mail inválido"),
  whatsapp: z.string().min(10, "WhatsApp inválido"),
  segment: z.string().optional(),
});

type LeadValues = z.infer<typeof leadSchema>;

export const Route = createFileRoute("/cadastro-cliente")({
  head: () => ({
    meta: [
      { title: "Seja nosso cliente — MTX Hub" },
      { name: "description", content: "Preencha seus dados para conversarmos sobre como a MTX pode ajudar o seu negócio." },
    ],
  }),
  component: PublicLeadPage,
});

function PublicLeadPage() {
  const [done, setDone] = useState(false);
  const search = Route.useSearch() as { ref?: string };

  const isValidUuid = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  const refId = search.ref && isValidUuid(search.ref) ? search.ref : null;

  const form = useForm<LeadValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      company_name: "",
      trade_name: "",
      contact_name: "",
      email: "",
      whatsapp: "",
      segment: "",
    },
  });

  const submit = useMutation({
    mutationFn: async (values: LeadValues) => {
      const payload = {
        company_name: values.company_name,
        trade_name: values.trade_name || null,
        contact_name: values.contact_name,
        email: values.email,
        whatsapp: values.whatsapp,
        niche: values.segment,
        status: "aberta",
        funnel_stage: "contato",
        priority: "media",
        lead_origin: refId ? "Link de Captação" : "Site/Formulário Público",
        ...(refId ? { commercial_responsible: refId } : {}),
      };

      const { error } = await supabase.from("opportunities").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setDone(true);
    },
    onError: (e: Error) => {
      console.error("Erro ao enviar dados de captação:", e);
      toast.error("Erro ao enviar seus dados. Tente novamente.");
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
            <h1 className="text-3xl font-bold tracking-tight">Dados recebidos!</h1>
            <p className="text-muted-foreground text-lg">
              Sua solicitação foi enviada com sucesso para a nossa equipe.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-sm text-left">
            <p className="font-medium mb-1 text-primary">Próximos passos:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Nossa equipe comercial analisará suas informações</li>
              <li>Entraremos em contato o mais breve possível via WhatsApp ou E-mail</li>
              <li>Você receberá nosso Briefing Completo em breve!</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">— Equipe MTX Hub</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <img src="/mtx-hub-logo.png" alt="MTX Hub" className="h-14 w-auto drop-shadow-[0_0_15px_rgba(192,38,211,0.3)] mb-2" />
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">Trabalhe com a MTX</h1>
            <p className="text-muted-foreground font-medium">Deixe seus dados e entraremos em contato</p>
          </div>
        </div>

        <Card className="border-border/50 shadow-xl shadow-black/5 overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-5">
                
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razão Social da Empresa *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Nome oficial da empresa" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="trade_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Fantasia (Opcional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Como a empresa é conhecida" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seu Nome *</FormLabel>
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
                      name="segment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Segmento (Opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Varejo, Tecnologia..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail *</FormLabel>
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
                      name="whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="(00) 00000-0000" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <Button 
                    type="submit" 
                    className="w-full font-bold bg-primary hover:bg-primary/90" 
                    disabled={submit.isPending}
                  >
                    {submit.isPending ? "Enviando..." : (
                      <>
                        Enviar Dados <Sparkles className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MTX Hub. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
