import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { journeyService, type UserJourney, type CatalogPhase } from "@/services/journeyService";

export function useJourney(targetUserId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = targetUserId ?? user?.id;

  const query = useQuery<UserJourney>({
    queryKey: ["user-journey", userId],
    enabled: !!userId,
    queryFn: async () => {
      const journey = await journeyService.getUserJourney(userId!);
      return journey;
    },

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
      toast.error(e.message || "Não foi possível salvar. Tente novamente.");
    },

    onSettled: () => qc.invalidateQueries({ queryKey: ["user-journey", userId] }),
  });

  return { ...query, toggleItem };
}

export function usePhaseMetadata() {
  return useQuery<CatalogPhase[]>({
    queryKey: ["catalog-phases-metadata"],
    queryFn: () => journeyService.getCatalogPhases(),
    staleTime: 1000 * 60 * 5, // Metadados podem ser cacheados por 5 min
  });
}
