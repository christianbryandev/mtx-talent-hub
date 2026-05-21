import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { journeyService, type UserJourney } from "@/services/journeyService";

export function useJourney(targetUserId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = targetUserId ?? user?.id;

  const query = useQuery<UserJourney>({
    queryKey: ["user-journey", userId],
    enabled: !!userId,
    queryFn: () => journeyService.getUserJourney(userId!),
  });

  const markItem = useMutation({
    mutationFn: (itemId: string) => journeyService.markChecklistItem(userId!, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-journey", userId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const submitQuiz = useMutation({
    mutationFn: (vars: { phaseId: string; score: number }) =>
      journeyService.submitQuizAttempt(userId!, vars.phaseId, vars.score),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["user-journey", userId] });
      if (res?.passed) toast.success("Quiz aprovado!");
      else toast.error("Nota insuficiente. Revise e tente novamente.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, markItem, submitQuiz };
}
