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
        "relative overflow-hidden cursor-pointer transition-all flex flex-col h-72 rounded-[12px] shadow-2xl",
        isLocked 
          ? "bg-[rgba(100,100,100,0.08)] border border-[#666666] cursor-not-allowed" 
          : "bg-[#0a0a0a] border-none hover:brightness-125 active:scale-[0.98] group"
      )}
    >
      {/* Cinematic Background Gradient (Base) */}
      {!isLocked && (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0a0a0a_0%,#1a0a1a_100%)]" />
      )}
      
      {/* Background Art Layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Atmospheric Glows */}
        {!isLocked && (
          <>
            <div className={cn(
              "absolute -top-[10%] -right-[10%] w-[80%] h-[80%] rounded-full blur-[120px] transition-all duration-1000",
              isInProgress ? "bg-[#e040fb] opacity-[0.12]" : "bg-[#00e676] opacity-[0.1]"
            )} />
            <div className={cn(
              "absolute -bottom-[20%] -left-[10%] w-[100%] h-[100%] rounded-full blur-[150px] transition-all duration-1000",
              isInProgress ? "bg-[#ff6d00] opacity-[0.08]" : "bg-[#00bcd4] opacity-[0.06]"
            )} />
          </>
        )}
        
        {/* Cinematic Film Grain / Noise */}
        <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

        {/* Abstract Cinematic Art (Subtle lines/particles) */}
        <div className="absolute inset-0 opacity-[0.05]">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`grad-${phase.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
                <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,20 Q50,50 100,20" fill="none" stroke={`url(#grad-${phase.id})`} strokeWidth="0.1" className={textPrimary} />
            <path d="M0,80 Q50,50 100,80" fill="none" stroke={`url(#grad-${phase.id})`} strokeWidth="0.1" className={textPrimary} />
          </svg>
        </div>

        {/* Scanlines effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] pointer-events-none" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full p-6">
        {/* Status Badge Top Right */}
        <div className="absolute top-6 right-6">
          <div className={cn(
            "px-2.5 py-0.5 rounded-[20px] border text-[9px] font-bold tracking-widest transition-all duration-500",
            badgeStyles
          )}>
            {badgeLabel}
          </div>
        </div>

        {/* Top Section: Number and Title */}
        <div className="flex flex-col items-start mt-2">
          <span className="text-[10px] font-bold text-[#aaaaaa] uppercase tracking-[3px] mb-1">
            FASE
          </span>
          <span className={cn(
            "text-[72px] font-bold tracking-tighter leading-[0.9] transition-all duration-500",
            textPrimary,
            !isLocked && "group-hover:scale-110 origin-top-left"
          )}>
            {phaseNumber}
          </span>
          <h3 className={cn(
            "font-bold text-[20px] mt-1 line-clamp-2 max-w-[90%]",
            textPrimary
          )}>
            {phase.title}
          </h3>
        </div>

        {/* Bottom Section: Progress Info */}
        <div className="mt-auto flex items-end justify-between pb-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-medium text-[#aaaaaa] uppercase tracking-wider">
              {modulesCount} módulos
            </span>
          </div>
          
          <div className="flex flex-col items-end">
            <span className={cn("text-[16px] font-black italic tracking-tighter", percentageColor)}>
              {phasePct}%
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar (Bottom Edge) */}
      <div className={cn(
        "absolute bottom-0 left-0 h-[6px] w-full transition-all duration-500", 
        progressBarBg,
        !isLocked && "group-hover:h-[8px]"
      )} />
    </Card>
  );
}

