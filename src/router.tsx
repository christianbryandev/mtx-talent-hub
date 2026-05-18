import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Mantém dados "frescos" por 1 min — evita refetch a cada navegação
        staleTime: 60 * 1000,
        // Garbage collect após 10 min
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Pré-carrega a rota assim que o usuário passa o mouse sobre o link
    defaultPreload: "intent",
    // Cache do preload por 60s, alinhado ao staleTime do Query
    defaultPreloadStaleTime: 60 * 1000,
  });

  return router;
};
