import { useState, useMemo } from "react";
import { CheckCircle2, XCircle, ArrowRight, RotateCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useQuiz } from "@/hooks/useQuiz";
import { QuizQuestion, QuizSubmitResult } from "@/services/quizService";
import { toast } from "sonner";

interface QuizViewProps {
  phaseId: string;
  onClose: (passed: boolean) => void;
}

export function QuizView({ phaseId, onClose }: QuizViewProps) {
  const { quiz, submit } = useQuiz(phaseId);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  const questions = useMemo(() => quiz.data?.questions || [], [quiz.data]);
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleNext = () => {
    if (isLastQuestion) {
      const payload = Object.entries(answers)
        .filter(([_, optionId]) => optionId !== "") // Filters out empty text answers if any
        .map(([questionId, optionId]) => ({
          question_id: questionId,
          option_id: optionId,
        }));
      
      submit.mutate(payload, {
        onSuccess: (res) => setResult(res),
      });
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
  };

  if (quiz.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Carregando quiz...</p>
      </div>
    );
  }

  if (result) {
    const isApproved = result.passed;
    return (
      <div className="space-y-8 py-4 animate-in fade-in zoom-in duration-300">
        <div className="text-center space-y-4">
          <div className={`text-6xl font-black ${isApproved ? "text-emerald-500" : "text-destructive"}`}>
            {result.score}%
          </div>
          <div className="text-xl font-bold text-foreground">
            {result.correct} de {result.total} corretas
          </div>
          
          <p className="text-muted-foreground max-w-xs mx-auto">
            {isApproved 
              ? "Parabéns! Você demonstrou um ótimo conhecimento e está pronto para avançar." 
              : "Não foi dessa vez. Revise o conteúdo do módulo e tente novamente para desbloquear o próximo item."}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {isApproved ? (
            <Button 
              size="lg" 
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-14 text-lg"
              onClick={() => onClose(true)}
            >
              Continuar <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <>
              <Button 
                size="lg" 
                className="w-full font-bold h-14 text-lg"
                onClick={handleRetry}
              >
                <RotateCw className="mr-2 h-5 w-5" /> Tentar novamente
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground"
                onClick={() => onClose(false)}
              >
                Voltar para a lista
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="space-y-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top Progress */}
      <div className="space-y-3">
        <div className="flex justify-between items-end text-xs font-bold text-muted-foreground uppercase tracking-widest">
          <span>Pergunta {currentQuestionIndex + 1} de {questions.length}</span>
          <span className="text-primary">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 bg-muted/50" />
      </div>

      {/* Question Content */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-foreground leading-tight">
          {currentQuestion.question}
        </h3>

        {currentQuestion.type === "texto" ? (
          <Textarea 
            placeholder="Escreva sua resposta aqui..."
            className="min-h-[150px] bg-muted/30 border-border/60 focus:border-primary/40 resize-none text-base p-4"
            value={answers[currentQuestion.id] || ""}
            onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
          />
        ) : (
          <div className="grid gap-3">
            {currentQuestion.options.map((option) => {
              const isSelected = answers[currentQuestion.id] === option.id;
              return (
                <Card
                  key={option.id}
                  onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: option.id }))}
                  className={`p-4 cursor-pointer transition-all border-border/60 hover:border-primary/40 active:scale-[0.99] ${
                    isSelected ? "bg-primary/10 border-primary shadow-sm" : "bg-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      {option.text}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Button */}
      <Button 
        size="lg" 
        className="w-full font-bold h-14 text-lg"
        disabled={!answers[currentQuestion.id] || submit.isPending}
        onClick={handleNext}
      >
        {submit.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isLastQuestion ? (
          "Finalizar"
        ) : (
          <>Próxima <ArrowRight className="ml-2 h-5 w-5" /></>
        )}
      </Button>
    </div>
  );
}
