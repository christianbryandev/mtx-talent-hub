import { createFileRoute, redirect } from "@tanstack/react-router";

// Rota legada: consolidada em /jornada (SSOT).
export const Route = createFileRoute("/_authenticated/minha-jornada")({
  beforeLoad: () => {
    throw redirect({ to: "/jornada" });
  },
});
