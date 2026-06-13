import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { quizService, type PhaseQuiz, type QuizSubmitResult } from "@/services/quizService";

export function useQuiz(quizId: string | undefined) {
  const qc = useQueryClient();

  const quiz = useQuery<PhaseQuiz | null>({
    queryKey: ["phase-quiz", quizId],
    enabled: !!quizId,
    queryFn: () => quizService.getPhaseQuiz(quizId!),
    staleTime: 0,
    gcTime: 0,
  });

  const submit = useMutation<QuizSubmitResult, Error, { question_id: string; option_id: string }[]>({
    mutationFn: (answers) => quizService.submitPhaseQuiz(quizId!, answers),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["phase-quiz", quizId] });
      qc.invalidateQueries({ queryKey: ["user-journey"] });
      if (res.idempotent) toast.success("Quiz já concluído anteriormente.");
      else if (res.passed) toast.success(`Aprovado! Nota ${res.score}%`);
      else toast.error(`Nota ${res.score}%. Tente novamente.`);
    },
    onError: (e) => toast.error(e.message || "Falha ao enviar quiz. Tente novamente."),
  });

  return { quiz, submit };
}
