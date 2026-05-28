import { createFileRoute } from "@tanstack/react-router";
import {
  Lock,
  CheckCircle2,
  Circle,
  Sparkles,
  XCircle,
  HelpCircle,
  Loader2,
  ExternalLink,
  Paperclip,
  BookOpen,
  Target,
  Trophy,
  Award,
  Zap,
  GraduationCap,
  ArrowRight,
  Rocket,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useJourney } from "@/hooks/useJourney";
import { startUserJourney } from "@/utils/journeySeed";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { externalLinkProps, normalizeExternalUrl } from "@/lib/external-url";
import type { JourneyPhase, PhaseStatus, UserJourney } from "@/services/journeyService";
import { QuizCard } from "@/components/jornada/QuizCard";
import {
  AchievementsSection,
  JourneyCompletedBanner,
} from "@/components/jornada/AchievementsSection";
import { JourneyLeaderboard } from "@/components/jornada/JourneyLeaderboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export const Route = createFileRoute("/_authenticated/jornada")({
  head: () => ({ meta: [{ title: "Jornada — MTX Hub" }] }),
  component: JourneyPage,
});

const STATUS_META: Record<
  PhaseStatus,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    icon: typeof Lock;
    accent: string;
  }
> = {
  bloqueada: { label: "Bloqueada", variant: "outline", icon: Lock, accent: "text-muted-foreground" },
  reprovada: { label: "Reprovada", variant: "destructive", icon: XCircle, accent: "text-destructive" },
  aguardando_quiz: { label: "Aguardando quiz", variant: "secondary", icon: HelpCircle, accent: "text-amber-500" },
  nao_iniciada: { label: "Não iniciada", variant: "outline", icon: Circle, accent: "text-muted-foreground" },
  em_andamento: { label: "Em andamento", variant: "default", icon: Sparkles, accent: "text-sky-500" },
  concluida: { label: "Concluída", variant: "secondary", icon: CheckCircle2, accent: "text-emerald-500" },
};

interface NextMission {
  phase: JourneyPhase;
  kind: "checklist" | "quiz" | "locked" | "done" | "start";
  label: string;
  cta: string;
}

function detectNextMission(j: UserJourney): NextMission | null {
  if (!j.phases.length) return null;
  const byOrder = [...j.phases].sort((a, b) => a.order_index - b.order_index);

  // Prioridade: 1) reprovada  2) aguardando_quiz  3) em_andamento  4) nao_iniciada
  const reprovada = byOrder.find((p) => p.status === "reprovada");
  if (reprovada) return { phase: reprovada, kind: "checklist", label: "Refaça o quiz", cta: "Abrir fase" };

  const aguardando = byOrder.find(
    (p) =>
      p.status === "aguardando_quiz" ||
      (p.has_quiz && p.cards_total > 0 && p.cards_done >= p.cards_total && p.status !== "concluida"),
  );
  if (aguardando) return { phase: aguardando, kind: "quiz", label: "Próximo: fazer o quiz da fase", cta: "Ir para o Quiz" };

  const emAndamento = byOrder.find((p) => p.status === "em_andamento");
  if (emAndamento) return { phase: emAndamento, kind: "checklist", label: "Continuar tarefa", cta: "Abrir fase" };

  const naoIniciada = byOrder.find((p) => p.status === "nao_iniciada");
  if (naoIniciada) return { phase: naoIniciada, kind: "start", label: "Iniciar fase", cta: "Iniciar Fase" };

  // Bloqueada (caso só sobre fase travada) ou tudo concluído
  const bloqueada = byOrder.find((p) => p.status === "bloqueada");
  if (bloqueada) return { phase: bloqueada, kind: "locked", label: "Aguardando desbloqueio", cta: "Aguarde" };

  const allDone = byOrder.every((p) => p.status === "concluida");
  if (allDone) return { phase: byOrder[byOrder.length - 1], kind: "done", label: "Jornada concluída", cta: "Revisar fases" };

  return null;
}


function JourneyPage() {
  
  const { data, isLoading, isError, error, isFetching, toggleItem } = useJourney();
  const [openPhaseId, setOpenPhaseId] = useState<string | null>(null);

  useEffect(() => {
    if (!openPhaseId) return;
    const t = setTimeout(() => {
      if (typeof document !== "undefined") {
        document
          .getElementById(`phase-${openPhaseId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
    return () => clearTimeout(t);
  }, [openPhaseId]);

  const mission = useMemo(() => (data ? detectNextMission(data) : null), [data]);
  const quizzesApproved = useMemo(
    () => (data ? data.phases.filter((p) => p.has_quiz && p.status === "concluida").length : 0),
    [data],
  );
  const quizzesTotal = useMemo(
    () => (data ? data.phases.filter((p) => p.has_quiz).length : 0),
    [data],
  );
  const phasesDone = useMemo(
    () => (data ? data.phases.filter((p) => p.status === "concluida").length : 0),
    [data],
  );

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (isError)
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível carregar a jornada. Tente novamente em instantes.
          {error instanceof Error && (
            <span className="block text-xs opacity-70 mt-1">{error.message}</span>
          )}
        </AlertDescription>
      </Alert>
    );
  if (!data) return <p className="text-muted-foreground">Sem dados.</p>;

  const notStarted =
    data.phases.length > 0 &&
    data.done_items === 0 &&
    data.phases.every((p) => p.status === "nao_iniciada" || p.status === "bloqueada");

  if (data.phases.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Jornada ainda não configurada</h2>
        <p className="text-sm text-muted-foreground">
          Peça a um administrador para popular o catálogo de fases.
        </p>
      </Card>
    );
  }

  if (notStarted) return <WelcomeHero />;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Sua Jornada
            {isFetching && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </h1>
          <p className="text-muted-foreground mt-1">
            Conquiste XP, complete as fases e desbloqueie seu futuro!
          </p>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="font-medium">
              {data.done_items}/{data.total_items} itens concluídos
            </Badge>
            <Badge variant="outline" className="font-medium">
              {data.total_xp} XP Total
            </Badge>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 min-w-[200px]">
          <div className="w-full flex justify-between text-xs font-medium mb-1">
            <span>Progresso Geral</span>
            <span>{data.overall_progress}%</span>
          </div>
          <Progress value={data.overall_progress} className="h-2 w-full" />
        </div>
      </header>

      <Tabs defaultValue="trilha" className="w-full">
        <TabsList>
          <TabsTrigger value="trilha">Trilha</TabsTrigger>
          <TabsTrigger value="conquistas">
            <Award className="h-3.5 w-3.5 mr-1.5" /> Conquistas
          </TabsTrigger>
          <TabsTrigger value="ranking">
            <Trophy className="h-3.5 w-3.5 mr-1.5" /> Ranking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trilha" className="space-y-6 mt-4">
          <NextMissionBlock mission={mission} onOpenPhase={(id) => setOpenPhaseId(id)} />

          <IndicatorsRow
            xp={data.total_xp}
            progress={data.overall_progress}
            phasesDone={phasesDone}
            phasesTotal={data.phases.length}
            quizzesApproved={quizzesApproved}
            quizzesTotal={quizzesTotal}
          />

          <div className="space-y-4">
            {data.phases.map((phase) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                pending={toggleItem.isPending}
                forceOpen={openPhaseId === phase.id}
                onToggle={(itemId, completed) => toggleItem.mutate({ itemId, completed })}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="conquistas" className="space-y-6 mt-4">
          <JourneyCompletedBanner journey={data} />
          <AchievementsSection journey={data} />
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <JourneyLeaderboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NextMissionBlock({
  mission,
  onOpenPhase,
}: {
  mission: NextMission | null;
  onOpenPhase: (id: string) => void;
}) {
  if (!mission) {
    return (
      <Card className="p-5 bg-gradient-to-br from-muted/40 to-background border-border/60">
        <p className="text-sm text-muted-foreground">Nenhuma fase configurada ainda.</p>
      </Card>
    );
  }
  const isDone = mission.kind === "done";
  const isLocked = mission.kind === "locked";
  return (
    <Card
      className={`p-5 border-border/60 bg-gradient-to-br ${
        isDone
          ? "from-emerald-500/10 via-background to-background"
          : isLocked
            ? "from-muted/40 to-background"
            : "from-primary/10 via-background to-background"
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`rounded-md p-2 shrink-0 ${
              isDone
                ? "bg-emerald-500/15 text-emerald-500"
                : isLocked
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/15 text-primary"
            }`}
          >
            {isDone ? (
              <Trophy className="h-5 w-5" />
            ) : isLocked ? (
              <Lock className="h-5 w-5" />
            ) : mission.kind === "quiz" ? (
              <GraduationCap className="h-5 w-5" />
            ) : (
              <Target className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Próxima missão
            </div>
            <div className="font-semibold truncate">{mission.label}</div>
            <div className="text-xs text-muted-foreground truncate">
              Fase {mission.phase.order_index}: {mission.phase.title}
              {mission.kind === "checklist" && mission.phase.cards_total > 0 && (
                <> · {mission.phase.cards_done}/{mission.phase.cards_total} cards</>
              )}
            </div>
          </div>
        </div>
        <div className="shrink-0">
          {mission.kind === "quiz" ? (
            <Button
              onClick={() => {
                onOpenPhase(mission.phase.id);
                if (typeof document !== "undefined") {
                  document
                    .getElementById(`phase-${mission.phase.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              {mission.cta} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : isLocked ? (
            <Button variant="outline" disabled>
              <Lock className="mr-1 h-4 w-4" /> {mission.cta}
            </Button>
          ) : (
            <Button
              variant={isDone ? "outline" : "default"}
              onClick={() => {
                onOpenPhase(mission.phase.id);
                if (typeof document !== "undefined") {
                  document
                    .getElementById(`phase-${mission.phase.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              {mission.cta} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function IndicatorsRow({
  xp,
  progress,
  phasesDone,
  phasesTotal,
  quizzesApproved,
  quizzesTotal,
}: {
  xp: number;
  progress: number;
  phasesDone: number;
  phasesTotal: number;
  quizzesApproved: number;
  quizzesTotal: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <IndicatorCard icon={Zap} label="XP acumulado" value={`${xp}`} accent="text-amber-500" />
      <IndicatorCard
        icon={Sparkles}
        label="Progresso geral"
        value={`${progress}%`}
        accent="text-sky-500"
      />
      <IndicatorCard
        icon={CheckCircle2}
        label="Fases concluídas"
        value={`${phasesDone}/${phasesTotal}`}
        accent="text-emerald-500"
      />
      <IndicatorCard
        icon={GraduationCap}
        label="Quizzes aprovados"
        value={`${quizzesApproved}/${quizzesTotal}`}
        accent="text-primary"
      />
    </div>
  );
}

function IndicatorCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Lock;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <Card className="p-3 flex items-center gap-3 border-border/60 hover:border-border transition-colors">
      <div className={`rounded-md bg-muted/50 p-2 ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </div>
        <div className="font-semibold text-sm truncate">{value}</div>
      </div>
    </Card>
  );
}

function PhaseCard({
  phase,
  pending,
  forceOpen,
  onToggle,
}: {
  phase: JourneyPhase;
  pending: boolean;
  forceOpen?: boolean;
  onToggle: (itemId: string, completed: boolean) => void;
}) {
  const meta = STATUS_META[phase.status];
  const Icon = meta.icon;
  const [open, setOpen] = useState(
    phase.status === "em_andamento" || phase.status === "aguardando_quiz" || phase.status === "reprovada",
  );
  const locked = phase.status === "bloqueada";
  // Open imperatively when "Próxima missão" focuses this phase
  useEffect(() => {
    if (forceOpen && !locked) setOpen(true);
  }, [forceOpen, locked]);


  const phasePct =
    phase.cards_total > 0 ? Math.round((phase.cards_done / phase.cards_total) * 100) : 0;

  return (
    <Card
      id={`phase-${phase.id}`}
      className={`p-5 transition-all scroll-mt-20 border-border/60 ${
        locked ? "bg-muted/30 opacity-60 grayscale-[0.5] cursor-not-allowed" : "hover:border-primary/20 bg-card"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg ${locked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
            <Icon className={`h-5 w-5 shrink-0`} />
          </div>
          <div className="min-w-0">
            <div className={`font-bold text-lg ${locked ? "text-muted-foreground" : ""}`}>
              {phase.order_index}. {phase.title}
            </div>
            {phase.description && (
              <div className="text-sm text-muted-foreground line-clamp-1">{phase.description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant={meta.variant} className="px-2.5 py-0.5">
              {meta.label}
            </Badge>
            {!locked && (
              <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-2">
                <span>{phasePct}% concluído</span>
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${phasePct}%` }} />
                </div>
              </div>
            )}
          </div>
          {locked ? (
            <Lock className="h-5 w-5 text-muted-foreground/50 ml-2" />
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setOpen((o) => !o)}
              className="ml-2"
            >
              {open ? "Recolher" : "Expandir"}
              {open ? <ChevronDown className="ml-1.5 h-4 w-4" /> : <ChevronRight className="ml-1.5 h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {phase.status === "reprovada" && phase.last_quiz_score != null && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription className="text-xs">
            Última tentativa do quiz: {phase.last_quiz_score}%. Refaça para avançar.
          </AlertDescription>
        </Alert>
      )}

      {open && !locked && (
        <div className="mt-4 space-y-4">
          {phase.modules && phase.modules.length > 0 ? (
            <div className="space-y-4 pt-4 border-t border-border/40">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 mb-3">
                Módulos
              </h3>
              <div className="space-y-3">
                {phase.modules.map((module, idx) => (
                  <ModuleSection
                    key={module.id}
                    module={module}
                    pending={pending}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {phase.cards.map((card) => (
                <div key={card.id} className="rounded-md border border-border/60 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{card.title}</div>
                    {card.completed && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                  </div>
                  {card.description && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{card.description}</p>
                  )}
                  {card.notes && (
                    <p className="text-xs italic text-muted-foreground border-l-2 border-border/60 pl-2 whitespace-pre-line">
                      {card.notes}
                    </p>
                  )}
                  {card.materials && (
                    <div className="text-xs text-muted-foreground flex items-start gap-1">
                      <BookOpen className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="whitespace-pre-line">{card.materials}</span>
                    </div>
                  )}

                  {card.links?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {card.links.map((l, idx) => (
                        <a
                          key={idx}
                          href={normalizeExternalUrl(l.url)}
                          {...externalLinkProps}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> {l.label || l.url}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1 pt-1">
                    {card.items.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={item.completed}
                          disabled={pending}
                          onCheckedChange={(v) => onToggle(item.id, v === true)}
                        />
                        <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                          {item.title}
                        </span>
                        {!item.required && (
                          <span className="text-[10px] text-muted-foreground">(opcional)</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {phase.has_quiz && (
            <QuizCard
              phaseId={phase.id}
              phaseStatus={phase.status}
              cardsDone={phase.cards_done}
              cardsTotal={phase.cards_total}
            />
          )}
        </div>
      )}

      {locked && (
        <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <Lock className="h-3.5 w-3.5" /> 
          <span>Conclua a fase anterior para desbloquear este conteúdo.</span>
        </div>
      )}
    </Card>
  );
}

function WelcomeHero() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    try {
      const res = await startUserJourney();
      if (!res.started) {
        toast.error("Não foi possível iniciar. Verifique se há fases configuradas.");
        return;
      }
      toast.success("Bora! Sua jornada começou.");
      await qc.invalidateQueries({ queryKey: ["user-journey", user?.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao iniciar a jornada.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-10 text-center bg-gradient-to-br from-primary/10 via-background to-background border-border/60">
      <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Rocket className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2">Bem-vindo à Jornada MTX</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
        Sua trilha de evolução está pronta. Conclua cards, ganhe XP e libere
        novas fases conforme avança.
      </p>
      <Button size="lg" onClick={handleStart} disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Rocket className="mr-2 h-4 w-4" />
        )}
        Iniciar Minha Jornada
      </Button>
    </Card>
  );
}

function ModuleSection({
  module,
  pending,
  onToggle,
}: {
  module: any;
  pending: boolean;
  onToggle: (itemId: string, completed: boolean) => void;
}) {
  const [open, setOpen] = useState(module.unlocked && !module.completed);
  const locked = !module.unlocked;

  return (
    <div
      className={`rounded-lg border border-border/60 overflow-hidden transition-all ${
        locked ? "bg-muted/30 opacity-70" : "bg-card shadow-sm"
      }`}
    >
      <div
        className={`p-4 flex items-center justify-between gap-3 cursor-pointer select-none ${
          locked ? "cursor-not-allowed" : "hover:bg-muted/10"
        }`}
        onClick={() => !locked && setOpen(!open)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`rounded-full p-1.5 shrink-0 ${
              locked
                ? "bg-muted text-muted-foreground"
                : module.completed
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-primary/15 text-primary"
            }`}
          >
            {locked ? (
              <Lock className="h-4 w-4" />
            ) : module.completed ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className={`font-semibold text-sm truncate ${locked ? "text-muted-foreground" : ""}`}>
              Módulo {module.order_index}: {module.title}
            </h4>
            {module.description && (
              <p className="text-xs text-muted-foreground truncate">{module.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          {module.completed && !locked && (
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">
              Concluído
            </Badge>
          )}
          {!locked && (
            <ChevronRight
              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
            />
          )}
        </div>
      </div>

      {open && !locked && (
        <div className="p-4 pt-0 space-y-4 border-t border-border/40 bg-muted/5">
          {module.content_body && (
            <div className="text-sm text-foreground/80 leading-relaxed pt-3 whitespace-pre-line">
              {module.content_body}
            </div>
          )}

          <div className="space-y-2">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Checklist do Módulo</h5>
            <div className="space-y-1.5">
              {module.items.map((item: any) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/20 transition-colors cursor-pointer group"
                >
                  <div className="pt-0.5">
                    <Checkbox
                      checked={item.completed}
                      disabled={pending}
                      onCheckedChange={(v) => onToggle(item.id, v === true)}
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.title}
                    </span>
                    {!item.required && (
                      <span className="text-[10px] text-muted-foreground ml-2">(opcional)</span>
                    )}
                  </div>
                </label>
              ))}
              {module.items.length === 0 && (
                <p className="text-xs text-muted-foreground italic p-2">Sem tarefas vinculadas a este módulo.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

