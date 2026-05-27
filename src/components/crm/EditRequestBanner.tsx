import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  Clock,
  Lock,
  ShieldCheck,
  X,
  Loader2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { createNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";
import { EditRequestDialog } from "./EditRequestDialog";

interface EditRequest {
  id: string;
  requester_id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  status: "pendente" | "aprovado" | "rejeitado";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  approved_until: string | null;
  created_at: string;
}

interface Props {
  entityType: string;
  entityId: string;
  entityLabel?: string;
  /** A entidade está em estado bloqueado (ex: opportunity fechada)? */
  locked: boolean;
  /** Callback quando a aprovação muda o status de "pode editar". */
  onEditableChange?: (canEdit: boolean) => void;
}

/**
 * Retorna informações públicas do banner. Use o hook `useEditRequestState`
 * para saber se o usuário tem permissão temporária de edição.
 */
export function useEditRequestState(entityType: string, entityId: string) {
  const { user } = useAuth();
  const { data: requests = [] } = useQuery({
    queryKey: ["edit-requests", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edit_requests")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EditRequest[];
    },
  });

  const myRequests = requests.filter((r) => r.requester_id === user?.id);
  const latestMine = myRequests[0];
  const now = Date.now();
  const hasActiveApproval =
    !!latestMine &&
    latestMine.status === "aprovado" &&
    !!latestMine.approved_until &&
    new Date(latestMine.approved_until).getTime() > now;

  return { requests, myRequests, latestMine, hasActiveApproval };
}

export function EditRequestBanner({
  entityType,
  entityId,
  entityLabel,
  locked,
}: Props) {
  const qc = useQueryClient();
  const { isAdmin } = usePermissions();
  const [open, setOpen] = useState(false);
  const { requests, latestMine, hasActiveApproval } = useEditRequestState(
    entityType,
    entityId,
  );

  const pendingForAdmin = useMemo(
    () => requests.filter((r) => r.status === "pendente"),
    [requests],
  );

  if (!locked && requests.length === 0) return null;

  return (
    <>
      {/* Banner para o jovem_aprendiz/comercial */}
      {!isAdmin && locked && (
        <div className="rounded-lg border bg-card p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          {hasActiveApproval ? (
            <>
              <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Edição liberada</p>
                <p className="text-xs text-muted-foreground">
                  Você pode editar este registro até{" "}
                  {new Date(latestMine!.approved_until!).toLocaleString("pt-BR")}.
                </p>
              </div>
            </>
          ) : latestMine?.status === "pendente" ? (
            <>
              <Clock className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Solicitação pendente</p>
                <p className="text-xs text-muted-foreground">
                  Aguardando análise de um administrador.
                </p>
              </div>
            </>
          ) : latestMine?.status === "rejeitado" ? (
            <>
              <X className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Solicitação rejeitada</p>
                {latestMine.review_note && (
                  <p className="text-xs text-muted-foreground">
                    Motivo: {latestMine.review_note}
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
                Solicitar novamente
              </Button>
            </>
          ) : (
            <>
              <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Registro bloqueado</p>
                <p className="text-xs text-muted-foreground">
                  Solicite permissão para realizar alterações.
                </p>
              </div>
              <Button size="sm" onClick={() => setOpen(true)}>
                Solicitar edição
              </Button>
            </>
          )}
        </div>
      )}

      {/* Painel de aprovação para admins */}
      {isAdmin && pendingForAdmin.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="text-sm font-medium">
              {pendingForAdmin.length} solicitação(ões) de edição pendente(s)
            </p>
          </div>
          {pendingForAdmin.map((req) => (
            <AdminApprovalCard
              key={req.id}
              request={req}
              entityLabel={entityLabel}
              onReviewed={() =>
                qc.invalidateQueries({
                  queryKey: ["edit-requests", entityType, entityId],
                })
              }
            />
          ))}
        </div>
      )}

      <EditRequestDialog
        open={open}
        onOpenChange={setOpen}
        entityType={entityType}
        entityId={entityId}
        entityLabel={entityLabel}
      />
    </>
  );
}

function AdminApprovalCard({
  request,
  entityLabel,
  onReviewed,
}: {
  request: EditRequest;
  entityLabel?: string;
  onReviewed: () => void;
}) {
  const [note, setNote] = useState("");
  const [hours, setHours] = useState(24);

  const reviewMutation = useMutation({
    mutationFn: async (action: "aprovado" | "rejeitado") => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Não autenticado");

      const approvedUntil =
        action === "aprovado"
          ? new Date(Date.now() + hours * 3600 * 1000).toISOString()
          : null;

      const { error } = await supabase
        .from("edit_requests")
        .update({
          status: action,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          review_note: note || null,
          approved_until: approvedUntil,
        } as never)
        .eq("id", request.id);
      if (error) throw error;

      await createNotification({
        user_id: request.requester_id,
        title:
          action === "aprovado"
            ? "Solicitação aprovada"
            : "Solicitação rejeitada",
        message:
          action === "aprovado"
            ? `Você pode editar ${entityLabel ?? request.entity_type} por ${hours}h.`
            : note || "Sua solicitação foi rejeitada.",
        type: "status_alterado" as const,
        entity_type: request.entity_type,
        entity_id: request.entity_id,
      });

      await logActivity({
        action: `edit_request_${action}`,
        entity_type: request.entity_type,
        entity_id: request.entity_id,
        description: `Solicitação ${action}${note ? `: ${note}` : ""}`,
      });

      return action;
    },
    onSuccess: (action) => {
      toast.success(
        action === "aprovado" ? "Solicitação aprovada" : "Solicitação rejeitada",
      );
      onReviewed();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-md bg-background border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px]">
          {new Date(request.created_at).toLocaleString("pt-BR")}
        </Badge>
      </div>
      <p className="text-sm">{request.reason}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
        <div className="sm:col-span-2">
          <Label className="text-xs">Observação (opcional)</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Aprovado até atualização do contrato"
          />
        </div>
        <div>
          <Label className="text-xs">Janela (horas)</Label>
          <Input
            type="number"
            min={1}
            max={720}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value) || 24)}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => reviewMutation.mutate("rejeitado")}
          disabled={reviewMutation.isPending}
        >
          {reviewMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <X className="h-4 w-4 mr-1" />
          )}
          Rejeitar
        </Button>
        <Button
          size="sm"
          onClick={() => reviewMutation.mutate("aprovado")}
          disabled={reviewMutation.isPending}
        >
          {reviewMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Check className="h-4 w-4 mr-1" />
          )}
          Aprovar
        </Button>
      </div>
    </div>
  );
}
