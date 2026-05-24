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
      
      // Para cada fase, buscamos os módulos e injetamos no objeto da jornada
      const phasesWithModules = await Promise.all(
        journey.phases.map(async (phase) => {
          const [modules, checklistMapping] = await Promise.all([
            journeyService.getPhaseModules(phase.id),
            journeyService.getChecklistItemsWithModule(phase.id)
          ]);

          if (modules.length === 0) return { ...phase, modules: [] };

          // Criar um mapa de checklist_item_id -> module_id
          const moduleMap = new Map(checklistMapping.map(m => [m.id, m.module_id]));

          // Distribuir os itens de checklist nos módulos
          const allItems = phase.cards.flatMap(c => c.items);
          
          const modulesWithItems = modules.map((mod, index) => {
            const modItems = allItems.filter(item => moduleMap.get(item.id) === mod.id);
            const isCompleted = modItems.length > 0 && modItems.every(i => i.completed);
            
            return {
              ...mod,
              items: modItems,
              completed: isCompleted,
              unlocked: true // Será calculado abaixo
            } as any;
          });

          // Lógica de Cadeado (Lock): O primeiro é sempre aberto. 
          // Os seguintes só abrem se o anterior estiver concluído.
          const modulesWithLock = modulesWithItems.map((mod, idx) => {
            if (idx === 0) return { ...mod, unlocked: true };
            const prevModule = modulesWithItems[idx - 1];
            return { ...mod, unlocked: prevModule.completed };
          });

          return { ...phase, modules: modulesWithLock };
        })
      );

      return { ...journey, phases: phasesWithModules };
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
