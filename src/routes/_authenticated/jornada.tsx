import { createFileRoute } from "@tanstack/react-router";
import { Lock, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { useState } from "react";
import { useJourney } from "@/hooks/useJourney";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/jornada")({
  head: () => ({ meta: [{ title: "Jornada — MTX Hub" }] }),
  component: JourneyPage,
});

function JourneyPage() {
  const { data, isLoading, markItem, submitQuiz } = useJourney();

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return <p className="text-muted-foreground">Sem dados.</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minha Jornada</h1>
          <p className="text-sm text-muted-foreground">
            {data.done_items}/{data.total_items} itens · {data.total_xp} XP
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Progress value={data.overall_progress} />
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {data.overall_progress}% geral
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {data.phases.map((phase) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            onMark={(itemId) => markItem.mutate(itemId)}
            onSubmitQuiz={(score) => submitQuiz.mutate({ phaseId: phase.id, score })}
          />
        ))}
      </div>
    </div>
  );
}

function PhaseCard({
  phase,
  onMark,
  onSubmitQuiz,
}: {
  phase: ReturnType<typeof useJourney>["data"] extends infer T ? T extends { phases: infer P } ? P extends Array<infer X> ? X : never : never : never;
  onMark: (itemId: string) => void;
  onSubmitQuiz: (score: number) => void;
}) {
  const [score, setScore] = useState("");
  const [open, setOpen] = useState(phase.status === "em_andamento");
  const locked = !phase.unlocked;

  const phasePct =
    phase.cards_total > 0 ? Math.round((phase.cards_done / phase.cards_total) * 100) : 0;

  return (
    <Card className={`p-5 ${locked ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {locked ? (
            <Lock className="h-5 w-5 text-muted-foreground" />
          ) : phase.status === "concluido" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <Sparkles className="h-5 w-5 text-primary" />
          )}
          <div className="min-w-0">
            <div className="font-semibold truncate">
              {phase.order_index}. {phase.title}
            </div>
            {phase.description && (
              <div className="text-xs text-muted-foreground truncate">{phase.description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{phase.status}</Badge>
          <div className="text-xs text-muted-foreground hidden sm:block w-24">
            <Progress value={phasePct} />
          </div>
          {!locked && (
            <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
              {open ? "Fechar" : "Abrir"}
            </Button>
          )}
        </div>
      </div>

      {open && !locked && (
        <div className="mt-4 space-y-3">
          {phase.cards.map((card) => (
            <div key={card.id} className="rounded-md border border-border/60 p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{card.title}</div>
                {card.completed && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              </div>
              {card.description && (
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              )}
              <div className="mt-2 space-y-1">
                {card.items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={item.completed}
                      disabled={item.completed}
                      onCheckedChange={() => !item.completed && onMark(item.id)}
                    />
                    <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                      {item.title}
                    </span>
                    {!item.required && (
                      <span className="text-[10px] text-muted-foreground">(opcional)</span>
                    )}
                  </label>
                ))}
                {card.items.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Sem itens.</p>
                )}
              </div>
            </div>
          ))}

          {phase.has_quiz && phase.status !== "concluido" && (
            <div className="rounded-md border border-dashed border-primary/40 p-3">
              <div className="text-sm font-semibold mb-2">Quiz da fase (aprovação ≥ 80%)</div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Nota 0–100"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
                <Button
                  disabled={score === "" || phase.cards_done < phase.cards_total}
                  onClick={() => {
                    const n = Number(score);
                    if (!Number.isNaN(n)) {
                      onSubmitQuiz(n);
                      setScore("");
                    }
                  }}
                >
                  Enviar
                </Button>
              </div>
              {phase.cards_done < phase.cards_total && (
                <p className="text-xs text-muted-foreground mt-1">
                  Conclua todos os cards antes de enviar o quiz.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {locked && (
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
          <Circle className="h-3 w-3" /> Conclua a fase anterior para desbloquear.
        </p>
      )}
    </Card>
  );
}
