import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { YOUNG_STATUS_LABELS, type YoungStatus } from "@/types";

const STATUS_CLASSES: Record<YoungStatus, string> = {
  inscrito: "bg-muted text-muted-foreground border-border",
  em_analise: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  aprovado: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  em_formacao: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  em_pratica: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  ativo: "mtx-badge border-transparent",
  pausado: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  desligado: "bg-red-500/15 text-red-400 border-red-500/30",
  concluido: "bg-emerald-700/25 text-emerald-300 border-emerald-700/40",
};

export function StatusBadge({ status, className }: { status: YoungStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_CLASSES[status], className)}>
      {YOUNG_STATUS_LABELS[status]}
    </Badge>
  );
}
