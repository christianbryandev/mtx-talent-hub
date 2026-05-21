import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { useState } from "react";
import { useJourney } from "@/hooks/useJourney";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { externalLinkProps, normalizeExternalUrl } from "@/lib/external-url";
import type { JourneyPhase, PhaseStatus } from "@/services/journeyService";

export const Route = createFileRoute("/_authenticated/jornada")({
  head: () => ({ meta: [{ title: "Jornada — MTX Hub" }] }),
  component: JourneyPage,
});

const STATUS_META: Record<
  PhaseStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Lock }
> = {
  bloqueada: { label: "Bloqueada", variant: "outline", icon: Lock },
  reprovada: { label: "Reprovada", variant: "destructive", icon: XCircle },
  aguardando_quiz: { label: "Aguardando quiz", variant: "secondary", icon: HelpCircle },
  nao_iniciada: { label: "Não iniciada", variant: "outline", icon: Circle },
  em_andamento: { label: "Em andamento", variant: "default", icon: Sparkles },
  concluida: { label: "Concluída", variant: "secondary", icon: CheckCircle2 },
};

function JourneyPage() {
  const { isAdmin } = usePermissions();
  const { data, isLoading, isError, error, isFetching, toggleItem } = useJourney();

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError)
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível carregar a jornada. {(error as Error)?.message}
        </AlertDescription>
      </Alert>
    );
  if (!data) return <p className="text-muted-foreground">Sem dados.</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Minha Jornada
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.done_items}/{data.total_items} itens · {data.total_xp} XP
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link to="/minha-jornada">Visão admin</Link>
            </Button>
          )}
          <div className="w-full sm:w-64">
            <Progress value={data.overall_progress} />
            <div className="text-xs text-muted-foreground mt-1 text-right">
              {data.overall_progress}% geral
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {data.phases.map((phase) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            pending={toggleItem.isPending || submitQuiz.isPending}
            onToggle={(itemId, completed) => toggleItem.mutate({ itemId, completed })}
          />
        ))}
      </div>
    </div>
  );
}

function PhaseCard({
  phase,
  pending,
  onToggle,
}: {
  phase: JourneyPhase;
  pending: boolean;
  onToggle: (itemId: string, completed: boolean) => void;
}) {
  const meta = STATUS_META[phase.status];
  const Icon = meta.icon;
  const [open, setOpen] = useState(
    phase.status === "em_andamento" || phase.status === "aguardando_quiz" || phase.status === "reprovada",
  );
  const locked = phase.status === "bloqueada";

  const phasePct =
    phase.cards_total > 0 ? Math.round((phase.cards_done / phase.cards_total) * 100) : 0;

  return (
    <Card className={`p-5 ${locked ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="h-5 w-5 text-primary shrink-0" />
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
          <Badge variant={meta.variant}>{meta.label}</Badge>
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

      {phase.status === "reprovada" && phase.last_quiz_score != null && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription className="text-xs">
            Última tentativa do quiz: {phase.last_quiz_score}%. Refaça para avançar.
          </AlertDescription>
        </Alert>
      )}

      {open && !locked && (
        <div className="mt-4 space-y-3">
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

              {card.attachments?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {card.attachments.map((a, idx) => (
                    <a
                      key={idx}
                      href={normalizeExternalUrl(a.url)}
                      {...externalLinkProps}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                    >
                      <Paperclip className="h-3 w-3" /> {a.label || "Anexo"}
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
                {card.items.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Sem itens.</p>
                )}
              </div>
            </div>
          ))}

          {phase.has_quiz && phase.status !== "concluida" && (
            <div className="rounded-md border border-dashed border-primary/40 p-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Quiz da fase</div>
                <p className="text-xs text-muted-foreground">
                  Aprovação ≥ 80%. {phase.cards_done < phase.cards_total
                    ? "Conclua todos os cards antes de iniciar."
                    : "Você pode iniciar o quiz agora."}
                </p>
              </div>
              <Button
                disabled={phase.cards_done < phase.cards_total || pending}
                asChild={phase.cards_done >= phase.cards_total}
              >
                {phase.cards_done >= phase.cards_total ? (
                  <Link to="/jornada/quiz/$phaseId" params={{ phaseId: phase.id }}>
                    Fazer quiz
                  </Link>
                ) : (
                  <span>Fazer quiz</span>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {locked && (
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
          <Lock className="h-3 w-3" /> Conclua a fase anterior para desbloquear.
        </p>
      )}
    </Card>
  );
}
