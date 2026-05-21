import { useMemo } from "react";
import {
  Award,
  Lock,
  Sparkles,
  Trophy,
  Zap,
  GraduationCap,
  Flag,
  Rocket,
  Medal,
  Star,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { UserJourney } from "@/services/journeyService";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** 0..100 — progresso atual rumo a desbloquear */
  progress: number;
  unlocked: boolean;
  accent: string;
}

/**
 * Deriva conquistas exclusivamente a partir da SSOT (UserJourney).
 * Nenhuma regra nova de negócio: só interpretação visual de dados existentes.
 */
function deriveAchievements(j: UserJourney): Achievement[] {
  const phasesTotal = j.phases.length;
  const phasesDone = j.phases.filter((p) => p.status === "concluida").length;
  const quizzesTotal = j.phases.filter((p) => p.has_quiz).length;
  const quizzesPassed = j.phases.filter((p) => p.has_quiz && p.status === "concluida").length;
  const xp = j.total_xp;

  const pct = (cur: number, target: number) =>
    target <= 0 ? 0 : Math.min(100, Math.round((cur / target) * 100));

  const list: Achievement[] = [
    {
      id: "first-step",
      title: "Primeiro passo",
      description: "Conclua pelo menos 1 item de qualquer card.",
      icon: Rocket,
      progress: j.done_items > 0 ? 100 : 0,
      unlocked: j.done_items > 0,
      accent: "text-sky-500",
    },
    {
      id: "first-phase",
      title: "Fase concluída",
      description: "Conclua a sua primeira fase da jornada.",
      icon: Flag,
      progress: phasesDone > 0 ? 100 : pct(j.overall_progress, 100),
      unlocked: phasesDone >= 1,
      accent: "text-emerald-500",
    },
    {
      id: "first-quiz",
      title: "Aprovado no quiz",
      description: "Seja aprovado em pelo menos 1 quiz.",
      icon: GraduationCap,
      progress: quizzesPassed > 0 ? 100 : 0,
      unlocked: quizzesPassed >= 1,
      accent: "text-primary",
    },
    {
      id: "xp-100",
      title: "100 XP",
      description: "Acumule 100 pontos de experiência.",
      icon: Zap,
      progress: pct(xp, 100),
      unlocked: xp >= 100,
      accent: "text-amber-500",
    },
    {
      id: "xp-500",
      title: "500 XP",
      description: "Acumule 500 pontos de experiência.",
      icon: Star,
      progress: pct(xp, 500),
      unlocked: xp >= 500,
      accent: "text-amber-500",
    },
    {
      id: "all-quizzes",
      title: "Mestre dos quizzes",
      description: "Seja aprovado em todos os quizzes da jornada.",
      icon: Medal,
      progress: pct(quizzesPassed, quizzesTotal),
      unlocked: quizzesTotal > 0 && quizzesPassed >= quizzesTotal,
      accent: "text-violet-500",
    },
    {
      id: "journey-done",
      title: "Jornada completa",
      description: "Conclua todas as fases da jornada.",
      icon: Trophy,
      progress: pct(phasesDone, phasesTotal),
      unlocked: phasesTotal > 0 && phasesDone >= phasesTotal,
      accent: "text-emerald-500",
    },
  ];

  return list;
}

export function AchievementsSection({ journey }: { journey: UserJourney }) {
  const achievements = useMemo(() => deriveAchievements(journey), [journey]);
  const unlocked = achievements.filter((a) => a.unlocked);
  const inProgress = achievements.filter((a) => !a.unlocked && a.progress > 0);
  const upcoming = achievements.filter((a) => !a.unlocked && a.progress === 0);

  return (
    <section aria-labelledby="achievements-heading" className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <h2
          id="achievements-heading"
          className="text-lg font-semibold tracking-tight flex items-center gap-2"
        >
          <Award className="h-5 w-5 text-amber-500" />
          Conquistas
        </h2>
        <Badge variant="secondary" className="text-xs">
          {unlocked.length}/{achievements.length} desbloqueadas
        </Badge>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...unlocked, ...inProgress, ...upcoming].map((a) => (
          <AchievementCard key={a.id} achievement={a} />
        ))}
      </div>
    </section>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const { icon: Icon, title, description, progress, unlocked, accent } = achievement;
  return (
    <Card
      className={`p-4 border-border/60 transition-colors ${
        unlocked
          ? "bg-gradient-to-br from-amber-500/10 via-background to-background border-amber-500/30"
          : progress > 0
            ? "hover:border-border"
            : "opacity-70"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`rounded-md p-2 shrink-0 ${
            unlocked ? `bg-amber-500/15 ${accent}` : "bg-muted/60 text-muted-foreground"
          }`}
        >
          {unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-sm truncate">{title}</div>
            {unlocked && (
              <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
                <Sparkles className="h-3 w-3" /> Desbloqueada
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          {!unlocked && (
            <div className="mt-2">
              <Progress value={progress} className="h-1.5" />
              <div className="text-[10px] text-muted-foreground mt-1 text-right">
                {progress}%
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function JourneyCompletedBanner({ journey }: { journey: UserJourney }) {
  const allDone =
    journey.phases.length > 0 &&
    journey.phases.every((p) => p.status === "concluida");
  if (!allDone) return null;
  return (
    <Card className="p-6 text-center bg-gradient-to-br from-emerald-500/15 via-background to-background border-emerald-500/30">
      <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
        <Trophy className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold">Jornada concluída!</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Você finalizou todas as fases e acumulou {journey.total_xp} XP. Parabéns!
      </p>
    </Card>
  );
}
