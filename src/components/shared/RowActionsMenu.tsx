import { useState } from "react";
import { MoreHorizontal, Eye, Pencil, Copy, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  /** Label do registro (usado na confirmação). */
  label?: string;
  onView?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  deleteTitle?: string;
  deleteDescription?: string;
  /** Esconde o trigger se nenhuma ação estiver presente. */
}

/**
 * Menu padrão de ações por linha (Visualizar · Editar · Duplicar · Excluir).
 * Só renderiza as ações cujos handlers foram passados.
 */
export function RowActionsMenu({
  label,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  deleteTitle,
  deleteDescription,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  if (!onView && !onEdit && !onDuplicate && !onDelete) return null;

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!onDuplicate) return;
    setDuplicating(true);
    try {
      await onDuplicate();
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          {onView && (
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" /> Visualizar
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </DropdownMenuItem>
          )}
          {onDuplicate && (
            <DropdownMenuItem onClick={handleDuplicate} disabled={duplicating}>
              {duplicating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Duplicar
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {onDelete && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={deleteTitle ?? "Excluir registro?"}
          description={
            deleteDescription ??
            `${label ? `"${label}"` : "Este registro"} será excluído permanentemente. Esta ação não pode ser desfeita.`
          }
          confirmLabel="Excluir"
          variant="destructive"
          loading={deleting}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
