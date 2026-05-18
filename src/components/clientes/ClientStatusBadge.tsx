import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CLIENT_STATUS_LABELS, type ClientStatus } from "@/types/clients";

const STATUS_CLASSES: Record<ClientStatus, string> = {
  lead: "bg-muted text-muted-foreground border-border",
  qualificado: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  proposta_enviada: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  negociacao: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  fechado: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  onboarding: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  ativo: "mtx-badge border-transparent",
  pausado: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  encerrado: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function ClientStatusBadge({
  status,
  className,
}: {
  status: ClientStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_CLASSES[status], className)}>
      {CLIENT_STATUS_LABELS[status]}
    </Badge>
  );
}
