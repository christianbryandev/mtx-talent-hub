import { JourneyPhase } from "@/services/journeyService";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhaseGridCardProps {
  phase: JourneyPhase;
  onClick: (phase: JourneyPhase) => void;
}

export function PhaseGridCard({ phase, onClick }: PhaseGridCardProps) {
  const isLocked = phase.status === "bloqueada";
  const isCompleted = phase.status === "concluida";
  const isInProgress = !isLocked && !isCompleted;

  const phaseNumber = phase.order_index.toString().padStart(2, "0");
  const phasePct = phase.cards_total > 0 ? Math.round((phase.cards_done / phase.cards_total) * 100) : 0;
  
  const modulesCount = phase.modules?.length || phase.cards_total || 0;
  const modulesDone = phase.modules?.filter(m => m.completed).length || phase.cards_done || 0;

  // Cinematic Dark Style Colors
  let badgeStyles = "";
  let textPrimary = "text-[#ffffff]";
  let percentageColor = "";
  let progressBarBg = "";
  let badgeLabel = "";

  if (isInProgress) {
    badgeStyles = "text-[#e040fb] border-[#e040fb] bg-[#e040fb]/[0.08]";
    percentageColor = "text-[#e040fb]";
    progressBarBg = "bg-gradient-to-r from-[#e040fb] to-[#ff6d00]";
    badgeLabel = "EM ANDAMENTO";
  } else if (isCompleted) {
    badgeStyles = "text-[#00e676] border-[#00e676] bg-[#00e676]/[0.08]";
    percentageColor = "text-[#00e676]";
    progressBarBg = "bg-gradient-to-r from-[#00e676] to-[#00bcd4]";
    badgeLabel = "CONCLUÍDO";
  } else {
    // Blocked
    badgeStyles = "text-[#666666] border-[#666666] bg-[#666666]/[0.08]";
    textPrimary = "text-[#555555]";
    percentageColor = "text-[#666666]";
    progressBarBg = "bg-[#2a2a2a]";
    badgeLabel = "BLOQUEADA";
  }

  return (
    <Card
      onClick={() => !isLocked && onClick(phase)}
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all border-none flex flex-col h-full rounded-[12px] shadow-none",
        "bg-[#0a0a0a]",
        isLocked ? "cursor-not-allowed" : "hover:brightness-125 active:scale-[0.98]"
      )}
    >
      {/* Cinematic Background Art */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d0a0d] to-[#1a0a1a]" />
      
      {/* Decorative Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full blur-[100px] transition-opacity duration-500",
          isInProgress ? "bg-[#e040fb] opacity-[0.08]" : isCompleted ? "bg-[#00e676] opacity-[0.06]" : "bg-[#ffffff] opacity-[0.02]"
        )} />
        <div className={cn(
          "absolute -bottom-[30%] -left-[20%] w-[90%] h-[90%] rounded-full blur-[120px] transition-opacity duration-500",
          isInProgress ? "bg-[#ff6d00] opacity-[0.05]" : isCompleted ? "bg-[#00bcd4] opacity-[0.04]" : "bg-[#ffffff] opacity-[0.01]"
        )} />
        
        {/* Subtle Geometric Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03] text-white" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id={`pattern-${phase.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#pattern-${phase.id})`} />
          <path d="M0 30 L100 70 M0 70 L100 30" stroke="currentColor" strokeWidth="0.1" strokeDasharray="1 2" />
        </svg>
      </div>


      {/* Badge Status */}
      <div className="absolute top-3 right-3 z-10">
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 border",
            badgeStyles
          )}
        >
          {badgeLabel}
        </Badge>
      </div>

      {/* Visual Upper Area */}
      <div className="pt-8 pb-4 px-6 flex flex-col items-start relative">
        <span className="text-[9px] font-medium text-[#aaaaaa] tracking-[3px] uppercase mb-0">
          FASE
        </span>
        <span className={cn(
          "text-[72px] font-bold tracking-tighter leading-[0.9]",
          textPrimary
        )}>
          {phaseNumber}
        </span>
      </div>

      {/* Footer / Content */}
      <div className="px-6 pb-6 pt-2 flex-1 flex flex-col justify-end">
        <h3 className={cn(
          "font-bold text-[15px] line-clamp-1 mb-3",
          textPrimary
        )}>
          {phase.title}
        </h3>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#888888]">
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
          <span className={cn("font-bold", percentageColor)}>
            {isLocked ? "0%" : `${phasePct}%`}
          </span>
        </div>
      </div>

      {/* Custom Progress Bar at bottom */}
      <div className={cn("h-[3px] w-full", progressBarBg)} />
    </Card>
  );
}

