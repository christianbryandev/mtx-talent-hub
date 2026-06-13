import { Badge } from "@/components/ui/badge";
import { TRAIL_PHASE_LABELS, type TrailPhase } from "@/types";
import { usePhaseMetadata } from "@/hooks/useJourney";
import { useMemo } from "react";

export function PhaseBadge({ phase, label }: { phase: TrailPhase | null; label?: string }) {
  const { data: metadata } = usePhaseMetadata();
  
  const displayLabel = useMemo(() => {
    if (label) return label;
    if (!phase) return null;
    
    // Tenta encontrar no catálogo primeiro (SSOT)
    const meta = metadata?.find(m => {
      // Mapeia "fase_1" etc para order_index se necessário, 
      // ou apenas usa o nome se as fases no catálogo seguirem o padrão.
      const index = parseInt(phase.replace("fase_", ""));
      return m.order_index === index;
    });
    
    return meta?.title || TRAIL_PHASE_LABELS[phase];
  }, [phase, label, metadata]);

  if (!phase && !label) return <span className="text-xs text-muted-foreground">—</span>;
  
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
          borderRadius: "inherit",
        }}
      />
      <span className="relative">{displayLabel}</span>
    </Badge>
  );
}
