import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Loader2, Lock, Trophy } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { journeyService, type UserJourney } from "@/services/journeyService";
import type { MonitorRow } from "./JourneyMonitor";

interface QuizAttempt {
  id: string;
  phase_id: string;
  score: number;
  passed: boolean;
  attempt_number: number;
  created_at: string;
}

async function fetchAttempts(userId: string): Promise<QuizAttempt[]> {
  const { data, error } = await supabase
    .from("journey_quiz_attempts")
    .select("id, phase_id, score, passed, attempt_number, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

interface Props {
  row: MonitorRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JourneyMonitorDetail({ row, open, onOpenChange }: Props) {
  const userId = row?.user_id;

  const journeyQ = useQuery<UserJourney>({
    queryKey: ["admin-journey-detail", userId],
    enabled: !!userId && open,
    queryFn: () => journeyService.getUserJourney(userId!),
  });

  const attemptsQ = useQuery<QuizAttempt[]>({
    queryKey: ["admin-journey-attempts", userId],
    enabled: !!userId && open,
    queryFn: () => fetchAttempts(userId!),
  });

  const phases = journeyQ.data?.phases ?? [];
  const attempts = attemptsQ.data ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{row?.name ?? "Detalhe"}</SheetTitle>
          <SheetDescription className="flex items-center gap-3 flex-wrap">
            <span>{row?.email}</span>
            <Badge variant="secondary">{row?.status}</Badge>
          </SheetDescription>
        </SheetHeader>

        {(journeyQ.isLoading || attemptsQ.isLoading) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {journeyQ.isError && (
          <p className="text-sm text-destructive mt-4">
            Falha ao carregar jornada do jovem.
          </p>
        )}

        {journeyQ.data && (
          <div className="space-y-4 mt-4">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <KPI label="XP" value={journeyQ.data.total_xp} />
              <KPI label="Progresso" value={`${journeyQ.data.overall_progress}%`} />
              <KPI label="Itens" value={`${journeyQ.data.done_items}/${journeyQ.data.total_items}`} />
            </div>

            {/* Fases */}
            <section>
              <h3 className="text-sm font-semibold mb-2">Fases</h3>
              <div className="space-y-2">
                {phases.map((ph) => (
                  <Card key={ph.id}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <PhaseIcon status={ph.status} />
                          <div>
                            <div className="font-medium text-sm">{ph.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {ph.cards_done}/{ph.cards_total} cards · {ph.xp_reward} XP
                              {ph.last_quiz_score != null && (
                                <> · última nota {Math.round(ph.last_quiz_score)}%</>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant={statusVariant(ph.status)} className="text-xs">
                          {ph.status.replace("_", " ")}
                        </Badge>
                      </div>
                      {ph.cards_total > 0 && (
                        <Progress
                          value={(ph.cards_done / ph.cards_total) * 100}
                          className="h-1"
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Tentativas de quiz */}
            <section>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Trophy className="h-4 w-4" /> Tentativas de quiz ({attempts.length})
              </h3>
              {attempts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma tentativa registrada.
                </p>
              ) : (
                <div className="space-y-1">
                  {attempts.map((a) => {
                    const phase = phases.find((p) => p.id === a.phase_id);
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                      >
                        <div>
                          <div className="font-medium">{phase?.title ?? "Fase"}</div>
                          <div className="text-xs text-muted-foreground">
                            Tentativa #{a.attempt_number} ·{" "}
                            {new Date(a.created_at).toLocaleString("pt-BR")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-semibold">
                            {Math.round(a.score)}%
                          </span>
                          <Badge variant={a.passed ? "default" : "destructive"}>
                            {a.passed ? "Aprovado" : "Reprovado"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function PhaseIcon({ status }: { status: string }) {
  if (status === "concluida") return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === "bloqueada") return <Lock className="h-4 w-4 text-muted-foreground" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "concluida") return "default";
  if (status === "reprovada") return "destructive";
  if (status === "bloqueada") return "outline";
  return "secondary";
}
