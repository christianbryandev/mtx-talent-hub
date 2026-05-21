import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, RotateCw, XCircle, GraduationCap } from "lucide-react";
import { useQuiz } from "@/hooks/useQuiz";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QuizMediaPreview } from "@/components/jornada/QuizMediaPreview";
import type { QuizSubmitResult } from "@/services/quizService";

interface QuizCardProps {
  phaseId: string;
  phaseStatus: string;
  cardsDone: number;
  cardsTotal: number;
}

/**
 * UI inline do Quiz da fase.
 * - Backend (submit_phase_quiz) é a SSOT da aprovação.
 * - Não decide passa/não-passa no client; apenas reflete o resultado.
 */
export function QuizCard({ phaseId, phaseStatus, cardsDone, cardsTotal }: QuizCardProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  const isApproved = phaseStatus === "concluida";
  const canStart = cardsDone >= cardsTotal;

  const { quiz, submit } = useQuiz(open && !isApproved ? phaseId : undefined);

  // Fase já aprovada → badge e nada mais.
  if (isApproved) {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <div className="text-sm font-semibold">Quiz concluído</div>
        </div>
        <Badge variant="secondary" className="gap-1">
          <GraduationCap className="h-3 w-3" /> Aprovado
        </Badge>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="rounded-md border border-dashed border-primary/40 p-3 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold">Quiz da fase</div>
          <p className="text-xs text-muted-foreground">
            Aprovação ≥ 80%.{" "}
            {canStart ? "Você pode iniciar o quiz agora." : "Conclua todos os cards antes de iniciar."}
          </p>
        </div>
        <Button disabled={!canStart} onClick={() => setOpen(true)}>
          Fazer quiz
        </Button>
      </div>
    );
  }

  if (quiz.isLoading) {
    return <Skeleton className="h-40 w-full rounded-md" />;
  }

  if (quiz.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {(quiz.error as Error)?.message ?? "Não foi possível carregar o quiz."}
        </AlertDescription>
      </Alert>
    );
  }

  const data = quiz.data;
  if (!data) {
    return (
      <Alert>
        <AlertDescription>Nenhum quiz disponível para esta fase.</AlertDescription>
      </Alert>
    );
  }

  // Caso o backend informe que já passou (idempotência), reflete na UI.
  if (data.already_passed && !result) {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <div className="text-sm font-semibold">Quiz concluído</div>
        </div>
        <Badge variant="secondary">Aprovado</Badge>
      </div>
    );
  }

  // Resultado da última tentativa.
  if (result) {
    const passed = result.passed;
    return (
      <div
        className={`rounded-md border p-4 space-y-3 ${
          passed ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"
        }`}
      >
        <div className="flex items-center gap-2">
          {passed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <div className="font-semibold text-sm">
            {passed ? "Aprovado!" : "Ainda não foi dessa vez"}
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>
            Nota: <strong className="text-foreground">{result.score}%</strong> ({result.correct}/
            {result.total}) · Mínimo {result.passing_score}% · Tentativa #{result.attempt_number}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!passed ? (
            <Button
              size="sm"
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
            >
              <RotateCw className="mr-1 h-4 w-4" /> Tentar novamente
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setResult(null);
                setAnswers({});
                qc.invalidateQueries({ queryKey: ["user-journey"] });
              }}
            >
              Fechar
            </Button>
          )}
        </div>
      </div>
    );
  }

  const allAnswered = data.questions.every((q) => answers[q.id]);

  return (
    <div className="rounded-md border border-primary/40 p-4 space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="text-sm font-semibold">{data.title}</div>
          {data.description && (
            <p className="text-xs text-muted-foreground">{data.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Nota mínima: {data.passing_score}% · {data.questions.length} perguntas
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setAnswers({});
          }}
        >
          Cancelar
        </Button>
      </div>

      <div className="space-y-4">
        {data.questions.map((q, idx) => (
          <div key={q.id} className="space-y-2">
            <div className="text-sm font-medium">
              {idx + 1}. {q.question}
            </div>
            <RadioGroup
              value={answers[q.id] ?? ""}
              onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
            >
              {q.options.map((o) => (
                <div key={o.id} className="flex items-center gap-2">
                  <RadioGroupItem value={o.id} id={`${q.id}-${o.id}`} />
                  <Label htmlFor={`${q.id}-${o.id}`} className="cursor-pointer font-normal text-sm">
                    {o.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>

      <Button
        disabled={!allAnswered || submit.isPending}
        onClick={() => {
          const payload = Object.entries(answers).map(([question_id, option_id]) => ({
            question_id,
            option_id,
          }));
          submit.mutate(payload, {
            onSuccess: (r) => {
              setResult(r);
              // Refetch da jornada — backend é a SSOT do status da fase.
              qc.invalidateQueries({ queryKey: ["user-journey"] });
            },
          });
        }}
      >
        {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar respostas
      </Button>
    </div>
  );
}
