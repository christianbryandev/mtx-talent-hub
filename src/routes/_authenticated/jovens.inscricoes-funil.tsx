import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Check, 
  X, 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Copy,
  ExternalLink,
  CheckCircle2
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/jovens/inscricoes-funil")({
  head: () => ({ meta: [{ title: "Inscrições Pendentes — MTX Hub" }] }),
  component: PendingApplicationsPage,
});

function PendingApplicationsPage() {
  const qc = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["applications-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (app: any) => {
      // 1. Update status to approved
      const { error: updateError } = await supabase
        .from("applications")
        .update({ status: "approved" })
        .eq("id", app.id);
      
      if (updateError) throw updateError;

      // 2. Create invite
      const { data: invite, error: inviteError } = await supabase
        .from("invites")
        .insert({
          application_id: app.id,
          email: app.email,
        })
        .select("token")
        .single();

      if (inviteError) throw inviteError;

      return { app, invite };
    },
    onSuccess: (data) => {
      toast.success("Inscrição aprovada!");
      qc.invalidateQueries({ queryKey: ["applications-pending"] });
      setSelectedApp(null);
      
      // Show invite link
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/registro?token=${data.invite.token}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("applications")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição rejeitada");
      qc.invalidateQueries({ queryKey: ["applications-pending"] });
      setSelectedApp(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiado para a área de transferência!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/jovens"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inscrições Pendentes</h1>
          <p className="text-sm text-muted-foreground">Analise as solicitações de acesso controladas</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidatos aguardando análise</CardTitle>
          <CardDescription>
            Aprove para gerar um link exclusivo de registro ou rejeite a solicitação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhuma inscrição pendente encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app: any) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell>{app.email}</TableCell>
                    <TableCell>{app.phone || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(app.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedApp(app)}>
                        Analisar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detalhes e Ações */}
      <Dialog open={!!selectedApp} onOpenChange={(o) => !o && setSelectedApp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analisar Inscrição</DialogTitle>
            <DialogDescription>
              Revise os dados abaixo antes de aprovar ou rejeitar.
            </DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                <User className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <p className="text-sm font-medium leading-none">Nome completo</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedApp.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                <Mail className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <p className="text-sm font-medium leading-none">E-mail</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedApp.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                <Phone className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <p className="text-sm font-medium leading-none">Telefone</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedApp.phone || "Não informado"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                <Calendar className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <p className="text-sm font-medium leading-none">Data da inscrição</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedApp.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              className="text-destructive border-destructive/20 hover:bg-destructive/10"
              onClick={() => rejectMutation.mutate(selectedApp.id)}
              disabled={rejectMutation.isPending || approveMutation.isPending}
            >
              <X className="mr-2 h-4 w-4" /> Rejeitar
            </Button>
            <Button 
              onClick={() => approveMutation.mutate(selectedApp)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" /> Aprovar e Gerar Link
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Gerado */}
      <Dialog open={!!inviteLink} onOpenChange={(o) => !o && setInviteLink(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Link de Acesso Gerado
            </DialogTitle>
            <DialogDescription>
              Copie o link abaixo e envie para o jovem para que ele possa criar sua conta.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 pt-4">
            <div className="grid flex-1 gap-2">
              <Input
                defaultValue={inviteLink ?? ""}
                readOnly
                className="font-mono text-xs bg-muted"
              />
            </div>
            <Button type="button" size="sm" className="px-3" onClick={() => copyToClipboard(inviteLink ?? "")}>
              <span className="sr-only">Copiar</span>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="secondary" onClick={() => setInviteLink(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}