import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2, Users, Building2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ServiceFormDialog } from "@/components/servicos/ServiceFormDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteServiceCascade } from "@/lib/cascade-delete";
import { usePermissions } from "@/hooks/usePermissions";
import { BILLING_MODELS, type Service } from "@/types/tasks";

export const Route = createFileRoute("/_authenticated/servicos/$id")({
  head: () => ({ meta: [{ title: "Serviço — MTX Hub" }] }),
  component: ServicoDetailPage,
});

const brl = (v: number | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

function ServicoDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [addYoungId, setAddYoungId] = useState("");

  const { data: service, isLoading } = useQuery({
    queryKey: ["service", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as Service | null;
    },
  });

  const { data: youngLinks = [] } = useQuery({
    queryKey: ["service-youngs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_young_people")
        .select("id, young_id, young_people!inner(id, full_name, photo_url)")
        .eq("service_id", id);
      return (data ?? []) as Array<{
        id: string; young_id: string;
        young_people: { id: string; full_name: string; photo_url: string | null };
      }>;
    },
  });

  const { data: allYoungs = [] } = useQuery({
    queryKey: ["youngs-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("young_people").select("id, full_name").order("full_name");
      return data ?? [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-by-service", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_services")
        .select("id, client_id, clients!inner(id, company_name)")
        .eq("service_id", id);
      return (data ?? []) as Array<{
        client_id: string;
        clients: { id: string; company_name: string };
      }>;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-by-service", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks").select("id, title, kanban_column, priority, due_date")
        .eq("service_id", id).neq("kanban_column", "concluido").limit(20);
      return data ?? [];
    },
  });

  const addYoung = useMutation({
    mutationFn: async (youngId: string) => {
      const { error } = await supabase.from("service_young_people")
        .insert({ service_id: id, young_id: youngId } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Jovem adicionado");
      setAddYoungId("");
      qc.invalidateQueries({ queryKey: ["service-youngs", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeYoung = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from("service_young_people").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Jovem removido");
      qc.invalidateQueries({ queryKey: ["service-youngs", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (!service) return <Card className="p-8">Serviço não encontrado.</Card>;

  const bm = BILLING_MODELS.find((b) => b.value === service.billing_model);
  const availableYoungs = allYoungs.filter(
    (y) => !youngLinks.some((l) => l.young_id === y.id),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/servicos" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{service.name}</h1>
            <Badge variant={(service.status ?? "ativo") === "ativo" ? "default" : "secondary"}>
              {(service.status ?? "ativo") === "ativo" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          {service.category && (
            <p className="text-sm text-muted-foreground mt-1">{service.category}</p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-1" /> Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2 space-y-4">
          {service.description && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Descrição</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{service.description}</p>
            </div>
          )}
          {service.scope && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Escopo</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{service.scope}</p>
            </div>
          )}
          {service.deliverables && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Entregáveis</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{service.deliverables}</p>
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Modelo de cobrança</p>
            <p className="text-sm font-medium">{bm?.label ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor padrão</p>
            <p className="text-sm font-medium">{brl(service.default_value)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Prazo médio</p>
            <p className="text-sm font-medium">
              {service.average_deadline ? `${service.average_deadline} dias` : "—"}
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Jovens aptos ({youngLinks.length})</h3>
          </div>
          <div className="flex gap-2">
            <Select value={addYoungId} onValueChange={setAddYoungId}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Selecionar jovem" /></SelectTrigger>
              <SelectContent>
                {availableYoungs.map((y) => (
                  <SelectItem key={y.id} value={y.id}>{y.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!addYoungId} onClick={() => addYoung.mutate(addYoungId)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {youngLinks.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum jovem vinculado.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {youngLinks.map((l) => (
              <div key={l.id} className="flex items-center gap-2 rounded-full border px-2 py-1">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">
                    {l.young_people.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">{l.young_people.full_name}</span>
                <button
                  onClick={() => removeYoung.mutate(l.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Clientes ({clients.length})</h3>
          </div>
          {clients.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum cliente contrata este serviço.</p>
          ) : (
            <ul className="space-y-1">
              {clients.map((c) => (
                <li key={c.client_id}>
                  <Link
                    to="/clientes/$id" params={{ id: c.client_id }}
                    className="text-sm hover:underline"
                  >
                    {c.clients.company_name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Tarefas ativas ({tasks.length})</h3>
          </div>
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma tarefa ativa.</p>
          ) : (
            <ul className="space-y-1">
              {tasks.map((t) => (
                <li key={t.id} className="text-sm flex items-center justify-between">
                  <span className="truncate">{t.title}</span>
                  <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ServiceFormDialog open={editOpen} onOpenChange={setEditOpen} service={service} />
    </div>
  );
}
