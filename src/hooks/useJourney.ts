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
    // Estado crítico: sempre buscar fresco; nada de cache persistente.
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });

  const toggleItem = useMutation({
    mutationFn: (vars: { itemId: string; completed: boolean }) =>
      journeyService.toggleChecklistItem(userId!, vars.itemId, vars.completed),
    // Otimismo apenas na UI — backend é a fonte de verdade.
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["user-journey", userId] });
      const prev = qc.getQueryData<UserJourney>(["user-journey", userId]);
      if (prev) {
        const next: UserJourney = {
          ...prev,
          phases: prev.phases.map((ph) => ({
            ...ph,
            cards: ph.cards.map((c) => ({
              ...c,
              items: c.items.map((i) =>
                i.id === vars.itemId ? { ...i, completed: vars.completed } : i,
              ),
            })),
          })),
        };
        qc.setQueryData(["user-journey", userId], next);
      }
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["user-journey", userId], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["user-journey", userId] }),
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

  return { ...query, toggleItem, submitQuiz };
}
