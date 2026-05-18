import { Badge } from "@/components/ui/badge";
import { TRAIL_PHASE_LABELS, type TrailPhase } from "@/types";

export function PhaseBadge({ phase }: { phase: TrailPhase | null }) {
  if (!phase) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary font-medium">
      {TRAIL_PHASE_LABELS[phase]}
    </Badge>
  );
}
