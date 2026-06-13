import { JourneyPhase } from "@/services/journeyService";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, BookOpen, Wrench, Compass, Rocket, TrendingUp, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhaseGridCardProps {
  phase: JourneyPhase;
  onClick: (phase: JourneyPhase) => void;
  /** If true, bypasses all locks for admins */
  isAdmin?: boolean;
}

const MTX_LOGO_GRADIENT = "linear-gradient(to right, #FC9325, #F0562A, #DD2A7B, #C7288B, #8131AF, #515BD4)";

export function PhaseGridCard({ phase, onClick, isAdmin = false }: PhaseGridCardProps) {
  const modulesCount = phase.modules?.length || phase.cards_total || 0;
  const modulesDone = phase.modules?.filter(m => m.completed).length || phase.cards_done || 0;
  
  const phasePctRaw = modulesCount > 0 ? Math.round((modulesDone / modulesCount) * 100) : 0;
  
  const isCompleted = phase.status?.toLowerCase().includes("conclu") || 
                     phase.raw_status?.toLowerCase().includes("conclu") || 
                     (phase as any).status === "concluido" || 
                     phasePctRaw === 100;
  
  // Impede que fases que o jovem já passou fiquem bloqueadas por engano da API
  const isBlocked = phase.status === "bloqueada" && !isCompleted && phasePctRaw === 0;
  
  // Admins ignoram o bloqueio para testarem todas as fases.
  const isLocked = !isAdmin && isBlocked;
  const isInProgress = !isLocked && !isCompleted;

  // Se estiver concluída, forçamos 100% para evitar inconsistências com dados legados
  const phasePct = isCompleted ? 100 : phasePctRaw;

  const phaseNumber = phase.order_index.toString().padStart(2, "0");
  
  const getPhaseIcon = (index: number) => {
    switch (index) {
      case 1: return BookOpen;
      case 2: return Wrench;
      case 3: return Compass;
      case 4: return Rocket;
      case 5: return TrendingUp;
      case 6: return Flag;
      default: return BookOpen;
    }
  };
  
  const PhaseIcon = getPhaseIcon(phase.order_index);
  
  // Cinematic Theme Colors
  let badgeStyles = "";
  let textPrimary = "text-foreground";
  let percentageColor = "";
  let progressBarBg = "";
  let badgeLabel = "";
  let percentageInlineStyle: React.CSSProperties = {};
  let progressInlineStyle: React.CSSProperties = {};

  if (isInProgress) {
    badgeStyles = "text-[#e040fb] border-[#e040fb] bg-[#e040fb]/[0.08]";
    percentageColor = "text-[#e040fb]";
    progressBarBg = "bg-gradient-to-r from-[#e040fb] to-[#ff6d00]";
    badgeLabel = "EM ANDAMENTO";
  } else if (isCompleted) {
    badgeStyles = "text-white border-transparent";
    percentageInlineStyle = {
      backgroundImage: MTX_LOGO_GRADIENT,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent'
    };
    progressInlineStyle = {
      background: MTX_LOGO_GRADIENT
    };
    badgeLabel = "CONCLUÍDO";
  } else {
    // Blocked
    badgeStyles = "text-muted-foreground border-border bg-muted/20";
    textPrimary = "text-muted-foreground";
    percentageColor = "text-muted-foreground";
    progressBarBg = "bg-muted";
    badgeLabel = "BLOQUEADA";
  }

  return (
    <Card
      onClick={() => !isLocked && onClick(phase)}
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all flex flex-col h-72 rounded-[12px] shadow-2xl",
        isLocked 
          ? "bg-muted/10 border border-border cursor-not-allowed" 
          : "bg-card border-none hover:brightness-105 dark:hover:brightness-125 active:scale-[0.98] group"
      )}
    >
      {/* Cinematic Background Gradient (Base) */}
      {!isLocked && (
        <div 
          className="absolute inset-0 opacity-40 dark:opacity-100" 
          style={{ 
            background: isCompleted 
              ? "linear-gradient(135deg, rgba(245, 133, 41, 0.15), rgba(81, 91, 212, 0.05))" 
              : "linear-gradient(135deg, var(--card) 0%, rgba(200, 50, 150, 0.05) 100%)" 
          }} 
        />
      )}
      
      {/* Background Art Layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Atmospheric Glows */}
        {!isLocked && (
          <>
            <div className={cn(
              "absolute -top-[10%] -right-[10%] w-[80%] h-[80%] rounded-full blur-[120px] transition-all duration-1000",
              isInProgress ? "bg-[#e040fb] opacity-[0.12]" : isCompleted ? "bg-[#515BD4] opacity-[0.15]" : "bg-[#00e676] opacity-[0.1]"
            )} />
            <div className={cn(
              "absolute -bottom-[20%] -left-[10%] w-[100%] h-[100%] rounded-full blur-[150px] transition-all duration-1000",
              isInProgress ? "bg-[#ff6d00] opacity-[0.08]" : isCompleted ? "bg-[#F58529] opacity-[0.1]" : "bg-[#00bcd4] opacity-[0.06]"
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

        {/* Phase Background Icon */}
        <div className="absolute right-[-20px] top-[50%] translate-y-[-50%] opacity-[0.03] dark:opacity-[0.07] text-foreground pointer-events-none">
          <PhaseIcon size={160} strokeWidth={1} />
        </div>

        {/* Scanlines effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] pointer-events-none" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full p-6">
        {/* Status Badge Top Right */}
        <div className="absolute top-6 right-6 flex items-center gap-2">
          {isLocked && (
            <Lock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5} />
          )}
          <div 
            className={cn(
              "px-2.5 py-0.5 rounded-[20px] border text-[9px] font-bold tracking-widest transition-all duration-500",
              badgeStyles
            )}
            style={isCompleted ? {
              border: '2px solid transparent',
              backgroundImage: `linear-gradient(#0a0a0a, #0a0a0a), ${MTX_LOGO_GRADIENT}`,
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            } : {}}
          >
            {badgeLabel}
          </div>
        </div>

        {/* Top Section: Number and Title */}
        <div className="flex flex-col items-start mt-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[3px] mb-1">
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
            <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
              {modulesCount} módulos
            </span>
          </div>
          
          <div className="flex flex-col items-end">
            <span 
              className={cn("text-[16px] font-black italic tracking-tighter", percentageColor)}
              style={percentageInlineStyle}
            >
              {phasePct}%
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar (Bottom Edge) */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 h-[6px] w-full transition-all duration-500", 
          progressBarBg,
          !isLocked && "group-hover:h-[8px]"
        )} 
        style={progressInlineStyle}
      />
    </Card>
  );
}

