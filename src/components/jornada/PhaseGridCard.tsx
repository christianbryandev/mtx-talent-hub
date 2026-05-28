import { JourneyPhase } from "@/services/journeyService";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

interface PhaseGridCardProps {
  phase: JourneyPhase;
  onClick: (phase: JourneyPhase) => void;
}

export function PhaseGridCard({ phase, onClick }: PhaseGridCardProps) {
  const isLocked = phase.status === "bloqueada";
  const isCompleted = phase.status === "concluida";
  const isInProgress = phase.status === "em_andamento" || phase.status === "aguardando_quiz" || phase.status === "reprovada";

  const phaseNumber = phase.order_index.toString().padStart(2, "0");
  const phasePct = phase.cards_total > 0 ? Math.round((phase.cards_done / phase.cards_total) * 100) : 0;
  
  // Modules count - using cards as modules for now as per current data structure or modules if available
  const modulesCount = phase.modules?.length || phase.cards_total || 0;
  const modulesDone = phase.modules?.filter(m => m.completed).length || phase.cards_done || 0;

  return (
    <Card
      onClick={() => !isLocked && onClick(phase)}
      className={`relative overflow-hidden cursor-pointer transition-all border-border/60 flex flex-col h-full ${
        isLocked ? "opacity-60 grayscale-[0.5] cursor-not-allowed bg-muted/30" : "hover:border-primary/40 bg-card active:scale-[0.98]"
      }`}
    >
      {/* Badge Status */}
      <div className="absolute top-3 right-3 z-10">
        {isCompleted && (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none text-[10px] font-bold px-2 py-0.5">
            CONCLUÍDA
          </Badge>
        )}
        {isInProgress && (
          <Badge variant="outline" className="border-primary text-primary text-[10px] font-bold px-2 py-0.5 bg-primary/5">
            EM ANDAMENTO
          </Badge>
        )}
      </div>

      {/* Visual Upper Area (Thumbnail) */}
      <div className="aspect-[16/9] w-full bg-muted/50 flex flex-col items-center justify-center relative border-b border-border/40">
        <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-1">
          Fase
        </span>
        <span className="text-5xl font-black text-foreground tracking-tighter">
          {phaseNumber}
        </span>
      </div>

      {/* Footer / Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <h3 className="font-bold text-base line-clamp-1 text-foreground">
          {phase.title}
        </h3>
        
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {isLocked ? (
              <>
                <Lock className="h-3 w-3" />
                <span>Bloqueada</span>
              </>
            ) : (
              <span>
                {isCompleted 
                  ? `${modulesCount} módulos · 100%` 
                  : `${modulesDone} de ${modulesCount} módulos`
                }
              </span>
            )}
          </div>
          {!isLocked && !isCompleted && (
            <span className="font-medium text-primary">{phasePct}%</span>
          )}
        </div>
      </div>
    </Card>
  );
}
