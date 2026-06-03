import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Settings, ExternalLink, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: SettingsPage,
});

function SettingsPage() {
  const { isAdmin, isSuperAdmin, loading: permLoading } = usePermissions();
  const [testEmail, setTestEmail] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [configStatus, setConfigStatus] = useState<"not_configured" | "configured" | "unknown">("configured");
  const [lastResponse, setLastResponse] = useState<any>(null);

  const sendTestEmail = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke("send-approval-email", {
        body: {
          email,
          nome: "Jovem Teste",
          candidato_id: null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setLastResponse(data);
      toast.success("E-mail de teste enviado! Verifique sua caixa de entrada ✅");
      setConfigStatus("configured");
      // Keep dialog open to show response
    },
    onError: (error: any) => {
      setLastResponse({ error: error.message });
      console.error("Erro ao enviar e-mail de teste:", error);
      toast.error(`Erro ao enviar e-mail de teste: ${error.message}`);
      setConfigStatus("not_configured");
    },
  });

  const handleTestEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) {
      toast.error("Por favor, insira um e-mail válido.");
      return;
    }
    sendTestEmail.mutate(testEmail);
  };

  if (permLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="h-64 w-full bg-muted/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="container mx-auto py-8 max-w-4xl space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <h2 classAName="text-xl font-semibold">Acesso negado</h2>
            <p className="text-sm text-muted-foreground">
              Apenas administradores podem acessar as configurações de e-mail.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      <div className="flex items-center gap-2">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Mail className="h-6 w-6" />
                  Configuração de E-mail (Resend)
                </CardTitle>
                <CardDescription>
                  Configure o envio automático de e-mails de aprovação para os jovens.
                </CardDescription>
              </div>
              {configStatus === "configured" && (
                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1 px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Configurado e funcionando
                </Badge>
              )}
              {configStatus === "not_configured" && (
                <Badge variant="destructive" className="bg-red-500/15 text-red-400 border-red-500/30 gap-1 px-3 py-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Não configurado
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <p className="text-sm font-medium mb-3">
                Para que o envio funcione, você precisa adicionar sua chave de API do Resend como uma "Secret" nas Edge Functions do seu projeto no Supabase Dashboard.
              </p>
              
              <Button variant="outline" size="sm" asChild className="mb-4">
                <a 
                  href="https://supabase.com/dashboard/project/_/settings/functions" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Ir para Configurações do Supabase
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">1</span>
                  Acesse o link acima (você será levado para a área de Segredos das Funções)
                </h4>
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">2</span>
                  Clique no botão "Add secret"
                </h4>
                <div className="ml-7 space-y-2 p-3 bg-background rounded border border-border">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <span className="text-muted-foreground font-medium">Nome:</span>
                    <code className="col-span-2 bg-muted px-1.5 py-0.5 rounded text-primary">RESEND_API_KEY</code>
                    <span className="text-muted-foreground font-medium">Valor:</span>
                    <span className="col-span-2 italic text-muted-foreground">sua_chave_do_resend (ex: re_123...)</span>
                  </div>
                </div>
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">3</span>
                  Clique em Save para aplicar a configuração
                </h4>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setLastResponse(null);
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Mail className="h-4 w-4" />
                  Enviar e-mail de teste
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Testar envio de e-mail</DialogTitle>
                  <DialogDescription>
                    Insira seu e-mail para verificar se a integração com o Resend está funcionando corretamente.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleTestEmailSubmit} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail para teste</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="seu@email.com" 
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={sendTestEmail.isPending}
                      className="w-full sm:w-auto"
                    >
                      {sendTestEmail.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        "Enviar agora"
                      )}
                    </Button>
                  </DialogFooter>
                </form>

                {lastResponse && (
                  <div className="mt-6 space-y-2">
                    <Label className="text-sm font-semibold">Resposta da Edge Function:</Label>
                    <div className={`p-4 rounded-md border text-xs font-mono overflow-auto max-h-[300px] ${
                      lastResponse.error ? "bg-red-500/10 border-red-500/50 text-red-400" : "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                    }`}>
                      <pre>{JSON.stringify(lastResponse, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
