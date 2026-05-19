import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Circle, GraduationCap, ListChecks, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  TRAIL_PHASE_LABELS,
  TRAIL_PHASE_LIST,
  type TrailPhase,
  type YoungPerson,
} from "@/types";
import { PhaseCelebrationModal } from "./PhaseCelebrationModal";
import { QuizFailureModal } from "./QuizFailureModal";

const PASS_THRESHOLD = 80;

interface QuizAttempt {
  id: string;
  young_id: string;
  phase: string;
  score: number;
  passed: boolean;
  attempt_number: number;
  created_at: string;
}

interface ReviewItem {
  id: string;
  young_id: string;
  phase: string;
  attempt_id: string | null;
  item: string;
  reviewed: boolean;
  position: number;
}

function nextPhase(p: TrailPhase | null | undefined): TrailPhase | null {
  if (!p) return TRAIL_PHASE_LIST[0];
  const idx = TRAIL_PHASE_LIST.indexOf(p);
  if (idx < 0 || idx >= TRAIL_PHASE_LIST.length - 1) return null;
  return TRAIL_PHASE_LIST[idx + 1];
}

interface Props {
  young: YoungPerson;
  canSubmit: boolean; // is the logged-in user this young person
}

export function PhaseEvolutionPanel({ young, canSubmit }: Props) {
  const qc = useQueryClient();
  const currentPhase: TrailPhase = (young.trail_phase as TrailPhase | null) ?? TRAIL_PHASE_LIST[0];
  const [score, setScore] = useState("");
  const [celebrate, setCelebrate] = useState<{ open: boolean; phase: TrailPhase; next: TrailPhase | null; score: number } | null>(null);
  const [failure, setFailure] = useState<{ open: boolean; score: number; attempt: number } | null>(null);

  // Phase checklist from journey_phases (lessons + tasks done)
  const { data: phaseRow } = useQuery({
    queryKey: ["journey-phase", young.id, currentPhase],
    queryFn: async () => {
      const { data } = await supabase
        .from("journey_phases")
        .select("*")
        .eq("young_id", young.id)
        .eq("phase", currentPhase)
        .maybeSingle();
      return data;
    },
  });

  const checklist = (phaseRow?.checklist ?? []) as Array<{ label: string; done?: boolean }>;
  const lessonsDone = checklist.length > 0 && checklist.every((c) => c.done);
  // Tasks done = no open tasks linked to this young
  const { data: openTasks = 0 } = useQuery({
    queryKey: ["young-open-tasks", young.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("young_responsible", young.id)
        .not("status", "in", "(concluida,cancelada)");
      return count ?? 0;
    },
  });
  const tasksDone = openTasks === 0;

  const { data: attempts = [] } = useQuery({
    queryKey: ["quiz-attempts", young.id, currentPhase],
    queryFn: async () => {
      const { data } = await supabase
        .from("young_quiz_attempts")
        .select("*")
        .eq("young_id", young.id)
        .eq("phase", currentPhase)
        .order("attempt_number", { ascending: true });
      return (data ?? []) as QuizAttempt[];
    },
  });

  const lastAttempt = attempts[attempts.length - 1];
  const quizPassed = !!attempts.find((a) => a.passed);

  const { data: reviewItems = [] } = useQuery({
    queryKey: ["review-items", young.id, currentPhase, lastAttempt?.id],
    enabled: !!lastAttempt && !lastAttempt.passed,
    queryFn: async () => {
      const { data } = await supabase
        .from("phase_review_progress")
        .select("*")
        .eq("young_id", young.id)
        .eq("phase", currentPhase)
        .eq("attempt_id", lastAttempt!.id)
        .order("position");
      const items = (data ?? []) as ReviewItem[];
      if (items.length === 0) {
        const defaults = [
          "Módulo principal revisado",
          "Atividade obrigatória refeita",
          "Anotações de revisão atualizadas",
        ];
        const { data: inserted } = await supabase
          .from("phase_review_progress")
          .insert(
            defaults.map((item, position) => ({
              young_id: young.id,
              phase: currentPhase,
              attempt_id: lastAttempt!.id,
              item,
              position,
            })) as never,
          )
          .select("*");
        return (inserted ?? []) as ReviewItem[];
      }
      return items;
    },
  });

  const reviewDone = reviewItems.length > 0 && reviewItems.every((r) => r.reviewed);
  const canRetake = !lastAttempt || lastAttempt.passed || reviewDone;

  const totalProgress = useMemo(() => {
    const idx = TRAIL_PHASE_LIST.indexOf(currentPhase);
    const base = (idx / TRAIL_PHASE_LIST.length) * 100;
    let phaseFrac = 0;
    if (lessonsDone) phaseFrac += 1 / 3;
    if (tasksDone) phaseFrac += 1 / 3;
    if (quizPassed) phaseFrac += 1 / 3;
    return Math.min(100, base + (phaseFrac / TRAIL_PHASE_LIST.length) * 100);
  }, [currentPhase, lessonsDone, tasksDone, quizPassed]);

  const phaseProgressPct = Math.round(
    ((lessonsDone ? 1 : 0) + (tasksDone ? 1 : 0) + (quizPassed ? 1 : 0)) * (100 / 3),
  );

  const submitQuiz = useMutation({
    mutationFn: async () => {
      const num = Number(score);
      if (Number.isNaN(num) || num < 0 || num > 100) throw new Error("Nota inválida (0–100)");
      const passed = num >= PASS_THRESHOLD;
      const attemptNumber = attempts.length + 1;
      const { data: insAttempt, error } = await supabase
        .from("young_quiz_attempts")
        .insert({
          young_id: young.id,
          phase: currentPhase,
          score: num,
          passed,
          attempt_number: attemptNumber,
        } as never)
        .select("*")
        .single();
      if (error) throw error;
      const attempt = insAttempt as QuizAttempt;

      if (passed && lessonsDone && tasksDone) {
        const np = nextPhase(currentPhase);
        if (np) {
          await supabase
            .from("young_people")
            .update({
              trail_phase: np,
              last_progress_at: new Date().toISOString(),
              status: np === "fase_4" ? "em_pratica" : young.status,
            } as never)
            .eq("id", young.id);
          await supabase.from("young_evolution").insert({
            young_id: young.id,
            type: "phase_advance",
            previous_value: currentPhase,
            new_value: np,
            description: `Avanço automático para ${TRAIL_PHASE_LABELS[np]} (quiz ${num}%)`,
          } as never);
        }
        return { kind: "advanced" as const, attempt, next: np };
      }
      if (passed) {
        return { kind: "quiz_only" as const, attempt };
      }
      return { kind: "failed" as const, attempt };
    },
    onSuccess: (res) => {
      setScore("");
      qc.invalidateQueries({ queryKey: ["quiz-attempts"] });
      qc.invalidateQueries({ queryKey: ["young_people"] });
      qc.invalidateQueries({ queryKey: ["young_people", young.id] });
      if (res.kind === "advanced") {
        setCelebrate({ open: true, phase: currentPhase, next: res.next, score: res.attempt.score });
      } else if (res.kind === "quiz_only") {
        toast.success("Quiz concluído! Complete as aulas e tarefas restantes para avançar.");
      } else {
        setFailure({ open: true, score: res.attempt.score, attempt: res.attempt.attempt_number });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleReview = useMutation({
    mutationFn: async (r: ReviewItem) => {
      const { error } = await supabase
        .from("phase_review_progress")
        .update({ reviewed: !r.reviewed } as never)
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review-items"] }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Fase atual</div>
            <div className="text-lg font-semibold">{TRAIL_PHASE_LABELS[currentPhase]}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Progresso na fase</div>
            <div className="text-lg font-bold">{phaseProgressPct}%</div>
          </div>
        </div>
        <Progress value={phaseProgressPct} className="mt-3" />
        <div className="mt-4 grid gap-2 text-sm">
          <CriterionRow done={lessonsDone} icon={<GraduationCap className="h-4 w-4" />} label="Aulas/módulos da fase concluídos" />
          <CriterionRow done={tasksDone} icon={<ListChecks className="h-4 w-4" />} label={`Tarefas obrigatórias entregues (${openTasks} em aberto)`} />
          <CriterionRow done={quizPassed} icon={<Sparkles className="h-4 w-4" />} label={`Quiz com nota ≥ ${PASS_THRESHOLD}%`} />
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="text-sm font-semibold">Submissão do Quiz</div>
        {!canRetake && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            Complete a revisão obrigatória abaixo para desbloquear nova tentativa.
          </div>
        )}
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="Nota (0–100)"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            disabled={!canSubmit || !canRetake || quizPassed}
          />
          <Button
            disabled={!canSubmit || !canRetake || quizPassed || submitQuiz.isPending || score === ""}
            onClick={() => submitQuiz.mutate()}
          >
            Enviar quiz
          </Button>
        </div>
        {!canSubmit && (
          <p className="text-xs text-muted-foreground">Apenas o próprio jovem pode submeter o quiz.</p>
        )}

        {attempts.length > 0 && (
          <div className="space-y-1 text-sm">
            <div className="text-xs font-semibold text-muted-foreground">Histórico de tentativas</div>
            {attempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded border border-border/50 bg-card/40 px-2 py-1">
                <span>Tentativa {a.attempt_number}: {a.score.toFixed(0)}% {a.passed ? "✅" : "❌"}</span>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {lastAttempt && !lastAttempt.passed && (
        <Card className="p-5 space-y-3">
          <div className="text-sm font-semibold">Revisão obrigatória</div>
          <p className="text-xs text-muted-foreground">
            Marque os conteúdos que já revisou. Quando todos estiverem marcados, a nova tentativa é liberada.
          </p>
          <div className="space-y-2">
            {reviewItems.map((r) => (
              <label key={r.id} className="flex items-center gap-2 rounded border border-border/50 p-2 text-sm cursor-pointer">
                <Checkbox checked={r.reviewed} onCheckedChange={() => canSubmit && toggleReview.mutate(r)} disabled={!canSubmit} />
                <span className={r.reviewed ? "line-through text-muted-foreground" : ""}>{r.item}</span>
              </label>
            ))}
          </div>
        </Card>
      )}

      {celebrate && (
        <PhaseCelebrationModal
          open={celebrate.open}
          onOpenChange={(o) => setCelebrate((c) => (c ? { ...c, open: o } : c))}
          completedPhase={celebrate.phase}
          nextPhase={celebrate.next}
          quizScore={celebrate.score}
          totalProgress={totalProgress}
        />
      )}
      {failure && (
        <QuizFailureModal
          open={failure.open}
          onOpenChange={(o) => setFailure((f) => (f ? { ...f, open: o } : f))}
          score={failure.score}
          attemptNumber={failure.attempt}
          onReview={() => setFailure((f) => (f ? { ...f, open: false } : f))}
        />
      )}
    </div>
  );
}

function CriterionRow({ done, icon, label }: { done: boolean; icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
      <span className="text-muted-foreground">{icon}</span>
      <span className={done ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
