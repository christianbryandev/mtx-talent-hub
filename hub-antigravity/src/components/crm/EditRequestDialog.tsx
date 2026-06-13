import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { createNotification, getAdminUserIds } from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  entityId: string;
  entityLabel?: string;
}

export function EditRequestDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityLabel,
}: Props) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("edit_requests")
        .insert({
          requester_id: userId,
          entity_type: entityType,
          entity_id: entityId,
          reason,
          status: "pendente",
        } as never)
        .select("id")
        .single();
      if (error) throw error;

      // Notificar admins
      const adminIds = await getAdminUserIds();
      if (adminIds.length > 0) {
        await createNotification(
          adminIds.map((uid) => ({
            user_id: uid,
            title: "Nova solicitação de edição",
            message: `Solicitação para editar ${entityLabel ?? entityType}: ${reason}`,
            type: "geral" as const,
            entity_type: entityType,
            entity_id: entityId,
          })),
        );
      }

      await logActivity({
        action: "edit_request_created",
        entity_type: entityType,
        entity_id: entityId,
        description: `Solicitou edição: ${reason}`,
      });

      return data.id as string;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada aos administradores");
      qc.invalidateQueries({ queryKey: ["edit-requests", entityType, entityId] });
      setReason("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar permissão de edição</DialogTitle>
          <DialogDescription>
            Este registro está bloqueado. Descreva o motivo e um administrador irá
            avaliar a solicitação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Motivo *</Label>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explique por que precisa editar..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || reason.trim().length < 5}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
