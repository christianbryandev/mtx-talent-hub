import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, CheckCircle2, DollarSign, Sparkles, Plus, Search, LinkIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientStatusBadge } from "@/components/clientes/ClientStatusBadge";
import { ClientFormDialog } from "@/components/clientes/ClientFormDialog";
import { CaptacaoLinkDialog } from "@/components/clientes/CaptacaoLinkDialog";
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_LIST,
  type ClientStatus,
} from "@/types/clients";
import { usePermissions } from "@/hooks/usePermissions";
import { RowActionsMenu } from "@/components/shared/RowActionsMenu";
import { deleteClientCascade } from "@/lib/cascade-delete";
import { duplicateRow } from "@/lib/duplicate-row";
import { logActivity } from "@/lib/activity-log";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — MTX Hub" }] }),
  component: ClientesListPage,
});

type ClientRow = {
  id: string;
  company_name: string;
  trade_name: string | null;
  segment: string | null;
  city: string | null;
  state: string | null;
  status: ClientStatus;
  monthly_value: number | null;
  entry_date: string | null;
  active_contract: boolean | null;
  logo_url: string | null;
  commercial_responsible: string | null;
  commercial_profile?: { full_name: string | null; email: string | null } | null;
};

function ClientesListPage() {
  const { isAdmin, isComercial } = usePermissions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [contractFilter, setContractFilter] = useState<string>("all");

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(
          "id, company_name, trade_name, segment, city, state, status, monthly_value, entry_date, active_contract, logo_url, commercial_responsible"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientRow[];
    },
  });

  const segments = useMemo(
    () => Array.from(new Set(clients.map((c) => c.segment).filter(Boolean))) as string[],
    [clients]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (segmentFilter !== "all" && c.segment !== segmentFilter) return false;
      if (contractFilter === "yes" && !c.active_contract) return false;
      if (contractFilter === "no" && c.active_contract) return false;
      if (!term) return true;
      return (
        c.company_name?.toLowerCase().includes(term) ||
        c.trade_name?.toLowerCase().includes(term) ||
        c.segment?.toLowerCase().includes(term) ||
        c.city?.toLowerCase().includes(term)
      );
    });
  }, [clients, search, statusFilter, segmentFilter, contractFilter]);

  const kpis = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c) => c.status === "ativo").length;
    const recurring = clients
      .filter((c) => c.active_contract)
      .reduce((sum, c) => sum + (Number(c.monthly_value) || 0), 0);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = clients.filter(
      (c) => c.entry_date && new Date(c.entry_date) >= monthStart
    ).length;
    return { total, active, recurring, newThisMonth };
  }, [clients]);

  const fmtBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Empresas atendidas pela operação MTX
          </p>
        </div>
        {(isAdmin || isComercial) && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLinkOpen(true)}>
              <LinkIcon className="h-4 w-4 mr-2 text-primary" />
              Link de Captação
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo cliente
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total de clientes" value={kpis.total} icon={<Building2 className="h-4 w-4" />} />
        <KpiCard label="Clientes ativos" value={kpis.active} icon={<CheckCircle2 className="h-4 w-4" />} />
        <KpiCard label="Receita recorrente" value={fmtBRL(kpis.recurring)} icon={<DollarSign className="h-4 w-4" />} />
        <KpiCard label="Novos este mês" value={kpis.newThisMonth} icon={<Sparkles className="h-4 w-4" />} />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ, cidade ou segmento"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {CLIENT_STATUS_LIST.map((s) => (
              <SelectItem key={s} value={s}>{CLIENT_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os segmentos</SelectItem>
            {segments.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={contractFilter} onValueChange={setContractFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Contrato (todos)</SelectItem>
            <SelectItem value="yes">Contrato ativo</SelectItem>
            <SelectItem value="no">Sem contrato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor mensal</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40">
                  <TableCell>
                    <Link to="/clientes/$id" params={{ id: c.id }} className="font-medium">
                      {c.trade_name || c.company_name}
                    </Link>
                    {c.trade_name && (
                      <div className="text-xs text-muted-foreground">{c.company_name}</div>
                    )}
                  </TableCell>
                  <TableCell>{c.segment || "—"}</TableCell>
                  <TableCell>
                    {c.city ? `${c.city}${c.state ? `/${c.state}` : ""}` : "—"}
                  </TableCell>
                  <TableCell><ClientStatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-right">
                    {c.monthly_value ? fmtBRL(Number(c.monthly_value)) : "—"}
                  </TableCell>
                  <TableCell>
                    {c.entry_date
                      ? new Date(c.entry_date).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActionsMenu
                      label={c.company_name}
                      onView={() => navigate({ to: "/clientes/$id", params: { id: c.id } })}
                      onEdit={
                        isAdmin || isComercial
                          ? () => navigate({ to: "/clientes/$id", params: { id: c.id } })
                          : undefined
                      }
                      onDuplicate={
                        isAdmin || isComercial
                          ? async () => {
                              try {
                                const copy = await duplicateRow<{ id: string }>(
                                  "clients",
                                  c.id,
                                  { labelField: "company_name", excludeFields: ["profile_id"] },
                                );
                                await logActivity({
                                  action: "client_duplicated",
                                  entity_type: "client",
                                  entity_id: copy.id,
                                  description: `Cliente "${c.company_name}" duplicado`,
                                });
                                toast.success("Cliente duplicado");
                                qc.invalidateQueries({ queryKey: ["clients"] });
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
                                await deleteClientCascade(c.id);
                                await logActivity({
                                  action: "client_deleted",
                                  entity_type: "client",
                                  entity_id: c.id,
                                  description: `Cliente "${c.company_name}" excluído`,
                                });
                                toast.success("Cliente excluído");
                                qc.invalidateQueries({ queryKey: ["clients"] });
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            }
                          : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ClientFormDialog open={open} onOpenChange={setOpen} />
      <CaptacaoLinkDialog open={linkOpen} onOpenChange={setLinkOpen} userId={user?.id} />
    </div>
  );
}
