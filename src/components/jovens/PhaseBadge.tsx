import { Badge } from "@/components/ui/badge";
import { TRAIL_PHASE_LABELS, type TrailPhase } from "@/types";

export function PhaseBadge({ phase }: { phase: TrailPhase | null }) {
  if (!phase) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge
      variant="outline"
      className="relative border-transparent bg-gradient-mtx-soft font-medium text-foreground/90 backdrop-blur-sm"
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-md opacity-60"
        style={{
          padding: "1px",
          background: "var(--gradient-mtx)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <span className="relative">{TRAIL_PHASE_LABELS[phase]}</span>
    </Badge>
  );
}
