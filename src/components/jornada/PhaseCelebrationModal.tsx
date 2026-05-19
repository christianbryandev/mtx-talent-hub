import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket, Lock, Unlock } from "lucide-react";
import { TRAIL_PHASE_LABELS, TRAIL_PHASE_LIST, type TrailPhase } from "@/types";

const NEXT_PHASE_DESC: Record<TrailPhase, string> = {
  fase_1: "Começar pelos fundamentos do jeito MTX.",
  fase_2: "Capacitação técnica: ferramentas, processos e domínio prático.",
  fase_3: "Encontrar sua vocação dentro da agência.",
  fase_4: "Aplicar na prática com clientes reais.",
  fase_5: "Gerar valor consistente e construir renda.",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completedPhase: TrailPhase;
  nextPhase: TrailPhase | null;
  quizScore: number;
  totalProgress: number;
}

export function PhaseCelebrationModal({
  open,
  onOpenChange,
  completedPhase,
  nextPhase,
  quizScore,
  totalProgress,
}: Props) {
  useEffect(() => {
    if (!open) return;
    try {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 523;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      o.start();
      o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      o.stop(ctx.currentTime + 0.7);
    } catch {
      // ignore
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-none bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-0 text-white overflow-hidden">
        {/* Confetti dots */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-2 w-2 rounded-full bg-white/70 animate-bounce"
              style={{
                left: `${(i * 4.1) % 100}%`,
                top: `${(i * 7) % 80}%`,
                animationDelay: `${(i % 6) * 0.15}s`,
                animationDuration: `${1 + (i % 3) * 0.3}s`,
              }}
            />
          ))}
        </div>

        <div className="relative space-y-5 p-8">
          <div className="text-center">
            <Rocket className="mx-auto mb-3 h-12 w-12 drop-shadow-lg" />
            <h2 className="text-4xl font-black tracking-tight drop-shadow">🚀 FASE CONCLUÍDA!</h2>
            <p className="mt-1 text-white/90">Você avançou para o próximo nível na MTX</p>
          </div>

          <div className="rounded-lg bg-black/15 p-4 text-center text-sm">
            “Você fez o que muitos não fazem: começou… e terminou. Disciplina,
            compromisso e execução te trouxeram até aqui.”
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-lg bg-white/10 p-3">
              <div className="text-xs text-white/70">Fase concluída</div>
              <div className="mt-1 font-bold">{TRAIL_PHASE_LABELS[completedPhase]}</div>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <div className="text-xs text-white/70">Quiz</div>
              <div className="mt-1 font-bold">{quizScore.toFixed(0)}%</div>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <div className="text-xs text-white/70">Jornada MTX</div>
              <div className="mt-1 font-bold">{totalProgress.toFixed(0)}%</div>
            </div>
          </div>

          {nextPhase && (
            <div className="rounded-lg border border-white/30 bg-white/10 p-4">
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Lock className="h-4 w-4" />
                <span className="line-through">Bloqueado</span>
                <Unlock className="ml-1 h-4 w-4 text-yellow-200" />
                <span className="font-semibold">Nova fase liberada</span>
              </div>
              <div className="mt-2 text-xl font-bold">{TRAIL_PHASE_LABELS[nextPhase]}</div>
              <div className="mt-1 text-sm text-white/85">{NEXT_PHASE_DESC[nextPhase]}</div>
            </div>
          )}

          <div className="text-center text-sm italic text-white/90">
            “A partir daqui, não é mais só sobre aprender. É sobre se tornar
            alguém capaz de gerar resultado.”
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="lg"
              className="flex-1 bg-white text-emerald-700 hover:bg-white/90"
              onClick={() => onOpenChange(false)}
            >
              👉 Começar próxima fase
            </Button>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/15"
              onClick={() => onOpenChange(false)}
            >
              Revisar fase anterior
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
