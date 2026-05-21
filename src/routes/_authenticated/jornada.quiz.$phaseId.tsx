import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, XCircle, RotateCw } from "lucide-react";
import { useQuiz } from "@/hooks/useQuiz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { QuizSubmitResult } from "@/services/quizService";

export const Route = createFileRoute("/_authenticated/jornada/quiz/$phaseId")({
  head: () => ({ meta: [{ title: "Quiz — MTX Hub" }] }),
  component: QuizPage,
});

function QuizPage() {
  const { phaseId } = Route.useParams();
  const navigate = useNavigate();
  const { quiz, submit } = useQuiz(phaseId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  if (quiz.isLoading) return <Skeleton className="h-96 w-full" />;
  if (quiz.isError)
    return (
      <Alert variant="destructive">
        <AlertDescription>{(quiz.error as Error)?.message}</AlertDescription>
      </Alert>
    );
  if (!quiz.data)
    return (
      <Card className="p-6 space-y-3">
        <p className="text-sm text-muted-foreground">Nenhum quiz disponível para esta fase.</p>
        <Button variant="outline" asChild>
          <Link to="/jornada">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Link>
        </Button>
      </Card>
    );

  const data = quiz.data;
  const allAnswered = data.questions.every((q) => answers[q.id]);

  if (data.already_passed && !result) {
    return (
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">Quiz já concluído</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Você já foi aprovado neste quiz. Não é possível refazer.
        </p>
        <Button variant="outline" asChild>
          <Link to="/jornada">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar à jornada
          </Link>
        </Button>
      </Card>
    );
  }

  if (result) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          {result.passed ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          ) : (
            <XCircle className="h-6 w-6 text-destructive" />
          )}
          <h2 className="text-xl font-bold">
            {result.passed ? "Aprovado!" : "Ainda não foi dessa vez"}
          </h2>
        </div>
        <div className="text-sm space-y-1">
          <div>Sua nota: <strong>{result.score}%</strong></div>
          <div>Acertos: {result.correct}/{result.total}</div>
          <div>Mínimo: {result.passing_score}%</div>
          <div>Tentativa: #{result.attempt_number}</div>
        </div>
        <div className="flex gap-2">
          {!result.passed && (
            <Button
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
            >
              <RotateCw className="mr-2 h-4 w-4" /> Tentar novamente
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate({ to: "/jornada" })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar à jornada
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <header className="space-y-1">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/jornada">
            <ArrowLeft className="mr-1 h-4 w-4" /> Jornada
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{data.title}</h1>
        {data.description && (
          <p className="text-sm text-muted-foreground">{data.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Nota mínima: {data.passing_score}% · {data.questions.length} perguntas
        </p>
      </header>

      {data.questions.map((q, idx) => (
        <Card key={q.id} className="p-5 space-y-3">
          <div className="font-semibold text-sm">
            {idx + 1}. {q.question}
          </div>
          <RadioGroup
            value={answers[q.id] ?? ""}
            onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
          >
            {q.options.map((o) => (
              <div key={o.id} className="flex items-center gap-2">
                <RadioGroupItem value={o.id} id={o.id} />
                <Label htmlFor={o.id} className="cursor-pointer font-normal">
                  {o.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </Card>
      ))}

      <Button
        disabled={!allAnswered || submit.isPending}
        onClick={() => {
          const payload = Object.entries(answers).map(([question_id, option_id]) => ({
            question_id,
            option_id,
          }));
          submit.mutate(payload, { onSuccess: (r) => setResult(r) });
        }}
      >
        {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar respostas
      </Button>
    </div>
  );
}
