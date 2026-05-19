import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: number;
  attemptNumber: number;
  onReview: () => void;
}

export function QuizFailureModal({ open, onOpenChange, score, attemptNumber, onReview }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-amber-500/40 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/40 dark:to-background">
        <div className="space-y-4 p-2">
          <div>
            <h2 className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              Ainda não foi dessa vez.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Você concluiu esta etapa, mas ainda precisa revisar alguns pontos antes de avançar.
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-100/40 dark:bg-amber-900/20 p-3 text-sm space-y-1">
            <div>❌ Resultado no quiz: <strong>{score.toFixed(0)}%</strong></div>
            <div>✅ Nota mínima para avançar: <strong>80%</strong></div>
            <div>📘 Status: <strong>Revisão necessária</strong></div>
          </div>

          <p className="text-sm">
            “Isso não significa que você fracassou. Significa que essa fase ainda
            está te pedindo mais atenção, entendimento e preparo. Na MTX,
            avançar não é sobre correr. É sobre estar pronto.”
          </p>

          <ol className="list-decimal pl-5 text-sm space-y-1">
            <li>Revisar os conteúdos desta fase</li>
            <li>Completar a revisão obrigatória (checklist)</li>
            <li>Tentar novamente o quiz após concluir a revisão</li>
          </ol>

          <p className="text-sm italic text-muted-foreground">
            “Quem cresce de verdade não é quem acerta sempre. É quem assume o
            processo, corrige a rota e continua.”
          </p>

          <div className="flex items-center justify-between rounded-md border border-border bg-card p-3 text-sm">
            <div>
              <span className="font-semibold">Tentativa {attemptNumber}</span>
              <span className="ml-2 text-muted-foreground">— Última nota: {score.toFixed(0)}%</span>
            </div>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
              🟡 Em revisão
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={onReview}>
              <BookOpen className="mr-2 h-4 w-4" /> Revisar esta fase
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Tentar novamente depois
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
