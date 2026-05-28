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
        "relative overflow-hidden cursor-pointer transition-all border-none flex flex-col h-72 rounded-[12px] shadow-none",
        "bg-[#0a0a0a]",
        isLocked ? "cursor-not-allowed" : "hover:brightness-125 active:scale-[0.98] group"
      )}
    >
      {/* Cinematic Background Gradient */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#0a0a0a_0%,#1a0a1a_100%)]" />
      
      {/* Subtle Background Art Layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.4]">
        {/* Glows */}
        <div className={cn(
          "absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full blur-[100px] transition-all duration-700",
          isInProgress ? "bg-[#e040fb] opacity-[0.1]" : isCompleted ? "bg-[#00e676] opacity-[0.08]" : "bg-[#ffffff] opacity-[0.02]"
        )} />
        <div className={cn(
          "absolute -bottom-[30%] -left-[20%] w-[90%] h-[90%] rounded-full blur-[120px] transition-all duration-700",
          isInProgress ? "bg-[#ff6d00] opacity-[0.06]" : isCompleted ? "bg-[#00bcd4] opacity-[0.04]" : "bg-[#ffffff] opacity-[0.01]"
        )} />
        
        {/* Subtle Noise/Grain */}
        <div className="absolute inset-0 opacity-[0.1] mix-blend-soft-light bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />

        {/* Subtle Geometric Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.02] text-white" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id={`pattern-${phase.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#pattern-${phase.id})`} />
        </svg>

        {/* Floating Accent Lines */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-1000 translate-x-[-100%] group-hover:translate-x-[100%]" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full p-6">
        {/* Top Section: Number and Title */}
        <div className="flex flex-col">
          <span className={cn(
            "text-[72px] font-bold tracking-tighter leading-[1.1] transition-colors duration-500",
            textPrimary
          )}>
            {phaseNumber}
          </span>
          <h3 className={cn(
            "font-bold text-[18px] mt-[-10px] line-clamp-2",
            textPrimary
          )}>
            {phase.title}
          </h3>
        </div>

        {/* Bottom Section: Progress Info */}
        <div className="mt-auto flex items-end justify-between pb-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] text-[#aaaaaa]">
              {isLocked ? "Fase Bloqueada" : `${modulesCount} módulos`}
            </span>
          </div>
          
          <div className="flex flex-col items-end">
            <span className={cn("text-[14px] font-bold", percentageColor)}>
              {isLocked ? "0%" : `${phasePct}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar (Bottom Edge) */}
      <div className={cn("absolute bottom-0 left-0 h-[4px] w-full", progressBarBg)} />
    </Card>
  );
}

