import { useMemo, useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LayoutGrid, Plus, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OpportunityFormDialog } from "@/components/crm/OpportunityFormDialog";
import {
  FUNNEL_STAGE_LABELS,
  type Opportunity,
} from "@/types/crm";
import { RowActionsMenu } from "@/components/shared/RowActionsMenu";
import { usePermissions } from "@/hooks/usePermissions";
import { deleteOpportunityCascade } from "@/lib/cascade-delete";
import { duplicateRow } from "@/lib/duplicate-row";
import { logActivity } from "@/lib/activity-log";

export const Route = createFileRoute("/_authenticated/crm/lista")({
  head: () => ({ meta: [{ title: "CRM — Lista de oportunidades" }] }),
  component: CrmListPage,
});

const brl = (v: number | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

function CrmListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin, isComercial } = usePermissions();
  const canManage = isAdmin || isComercial;
  const [openNew, setOpenNew] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Opportunity[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url");
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("crm-opportunities-changes-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opportunities" },
        () => {
          qc.invalidateQueries({ queryKey: ["opportunities"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return opportunities.filter((o) => {
      if (q && !`${o.company_name} ${o.contact_name ?? ""}`.toLowerCase().includes(q))
        return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (priorityFilter !== "all" && o.priority !== priorityFilter) return false;
      return true;
    });
  }, [opportunities, search, statusFilter, priorityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Oportunidades — Lista</h1>
          <p className="text-sm text-muted-foreground">Visão em tabela do funil comercial</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/crm">
              <LayoutGrid className="h-4 w-4 mr-1" /> Visão Kanban
            </Link>
          </Button>
          <Button size="sm" onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova oportunidade
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="ganha">Ganha</SelectItem>
            <SelectItem value="perdida">Perdida</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma oportunidade encontrada.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Nicho</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Prob.</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer"
                  onClick={() => navigate({ to: "/crm/$id", params: { id: o.id } })}
                >
                  <TableCell className="font-medium">{o.company_name}</TableCell>
                  <TableCell>{o.contact_name ?? "—"}</TableCell>
                  <TableCell>{o.niche ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {FUNNEL_STAGE_LABELS[o.funnel_stage]}
                  </TableCell>
                  <TableCell className="text-right">{brl(o.estimated_value)}</TableCell>
                  <TableCell className="text-right">
                    {o.closing_probability != null ? `${o.closing_probability}%` : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {o.next_followup_date
                      ? new Date(o.next_followup_date).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const resp = profiles.find((p) => p.id === o.commercial_responsible);
                      return resp ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 overflow-hidden rounded-full bg-muted shrink-0">
                            {resp.avatar_url ? (
                               <img src={resp.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                               <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-[10px] font-bold">
                                 {resp.full_name?.charAt(0)?.toUpperCase() || "C"}
                               </div>
                            )}
                          </div>
                          <span className="text-xs truncate">{resp.full_name || "Sem nome"}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        o.status === "ganha"
                          ? "default"
                          : o.status === "perdida"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <RowActionsMenu
                      label={o.company_name}
                      onView={() => navigate({ to: "/crm/$id", params: { id: o.id } })}
                      onEdit={
                        canManage
                          ? () => navigate({ to: "/crm/$id", params: { id: o.id } })
                          : undefined
                      }
                      onDuplicate={
                        canManage
                          ? async () => {
                              try {
                                const copy = await duplicateRow<{ id: string }>(
                                  "opportunities",
                                  o.id,
                                  { labelField: "company_name", excludeFields: ["converted_client_id"] },
                                );
                                await logActivity({
                                  action: "opportunity_duplicated",
                                  entity_type: "opportunity",
                                  entity_id: copy.id,
                                  description: `Oportunidade "${o.company_name}" duplicada`,
                                });
                                toast.success("Oportunidade duplicada");
                                qc.invalidateQueries({ queryKey: ["opportunities"] });
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
                                await deleteOpportunityCascade(o.id);
                                await logActivity({
                                  action: "opportunity_deleted",
                                  entity_type: "opportunity",
                                  entity_id: o.id,
                                  description: `Oportunidade "${o.company_name}" excluída`,
                                });
                                toast.success("Oportunidade excluída");
                                qc.invalidateQueries({ queryKey: ["opportunities"] });
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            }
                          : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <OpportunityFormDialog open={openNew} onOpenChange={setOpenNew} />
    </div>
  );
}
