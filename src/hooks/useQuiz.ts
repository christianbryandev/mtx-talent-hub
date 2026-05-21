import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { quizService, type PhaseQuiz, type QuizSubmitResult } from "@/services/quizService";

export function useQuiz(phaseId: string | undefined) {
  const qc = useQueryClient();

  const quiz = useQuery<PhaseQuiz | null>({
    queryKey: ["phase-quiz", phaseId],
    enabled: !!phaseId,
    queryFn: () => quizService.getPhaseQuiz(phaseId!),
    staleTime: 0,
    gcTime: 0,
  });

  const submit = useMutation<QuizSubmitResult, Error, { question_id: string; option_id: string }[]>({
    mutationFn: (answers) => quizService.submitPhaseQuiz(phaseId!, answers),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["phase-quiz", phaseId] });
      qc.invalidateQueries({ queryKey: ["user-journey"] });
      if (res.passed) toast.success(`Aprovado! ${res.score}%`);
      else toast.error(`Nota ${res.score}%. Tente novamente.`);
    },
    onError: (e) => toast.error(e.message),
  });

  return { quiz, submit };
}
