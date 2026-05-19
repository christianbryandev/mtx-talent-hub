import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ServiceFormDialog } from "@/components/servicos/ServiceFormDialog";
import { BILLING_MODELS, type Service } from "@/types/tasks";
import { RowActionsMenu } from "@/components/shared/RowActionsMenu";
import { usePermissions } from "@/hooks/usePermissions";
import { deleteServiceCascade } from "@/lib/cascade-delete";
import { duplicateRow } from "@/lib/duplicate-row";
import { logActivity } from "@/lib/activity-log";

export const Route = createFileRoute("/_authenticated/servicos/")({
  head: () => ({ meta: [{ title: "Serviços — MTX Hub" }] }),
  component: ServicosListPage,
});

const brl = (v: number | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

function ServicosListPage() {
  const { isAdmin } = usePermissions();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [openNew, setOpenNew] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Service[];
    },
  });

  const { data: usageCounts = {} } = useQuery({
    queryKey: ["services-usage"],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_services").select("service_id").not("service_id", "is", null);
      const map: Record<string, number> = {};
      for (const row of (data ?? []) as Array<{ service_id: string }>) {
        map[row.service_id] = (map[row.service_id] ?? 0) + 1;
      }
      return map;
    },
  });


  const categories = useMemo(
    () => Array.from(new Set(services.map((s) => s.category).filter(Boolean))) as string[],
    [services],
  );

  const filtered = services.filter((s) => {
    const q = search.trim().toLowerCase();
    if (q && !s.name.toLowerCase().includes(q)) return false;
    if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
    if (statusFilter !== "all" && (s.status ?? "ativo") !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Serviços</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de serviços oferecidos pela MTX
          </p>
        </div>
        <Button size="sm" onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo serviço
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar serviço..."
            className="pl-8"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhum serviço encontrado.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => {
            const bm = BILLING_MODELS.find((b) => b.value === s.billing_model);
            return (
              <Card key={s.id} className="p-4 h-full hover:shadow-md transition border relative">
                <div className="absolute top-2 right-2">
                  <RowActionsMenu
                    label={s.name}
                    onView={() => navigate({ to: "/servicos/$id", params: { id: s.id } })}
                    onEdit={isAdmin ? () => setEditService(s) : undefined}
                    onDuplicate={
                      isAdmin
                        ? async () => {
                            try {
                              const copy = await duplicateRow<{ id: string }>(
                                "services",
                                s.id,
                                { labelField: "name" },
                              );
                              await logActivity({
                                action: "service_duplicated",
                                entity_type: "service",
                                entity_id: copy.id,
                                description: `Serviço "${s.name}" duplicado`,
                              });
                              toast.success("Serviço duplicado");
                              qc.invalidateQueries({ queryKey: ["services"] });
                            } catch (e) {
                              toast.error((e as Error).message);
                            }
                          }
                        : undefined
                    }
                    onDelete={
                      isAdmin
                        ? async () => {
                            try {
                              await deleteServiceCascade(s.id);
                              await logActivity({
                                action: "service_deleted",
                                entity_type: "service",
                                entity_id: s.id,
                                description: `Serviço "${s.name}" excluído`,
                              });
                              toast.success("Serviço excluído");
                              qc.invalidateQueries({ queryKey: ["services"] });
                            } catch (e) {
                              toast.error((e as Error).message);
                            }
                          }
                        : undefined
                    }
                  />
                </div>
                <Link
                  to="/servicos/$id"
                  params={{ id: s.id }}
                  className="block"
                >
                  <div className="flex items-start justify-between mb-2 pr-8">
                    <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <Badge variant={(s.status ?? "ativo") === "ativo" ? "default" : "secondary"}>
                      {(s.status ?? "ativo") === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm">{s.name}</h3>
                  {s.category && (
                    <p className="text-xs text-muted-foreground mt-0.5">{s.category}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{bm?.label ?? "—"}</span>
                    <span className="font-medium">{brl(s.default_value ?? s.base_price)}</span>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      <ServiceFormDialog open={openNew} onOpenChange={setOpenNew} />
      <ServiceFormDialog
        open={!!editService}
        onOpenChange={(o) => !o && setEditService(null)}
        service={editService}
      />
    </div>
  );
}
