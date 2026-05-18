import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/_authenticated/indicadores")({
  head: () => ({ meta: [{ title: "Indicadores — MTX Hub" }] }),
  component: () => (
    <ComingSoon title="Indicadores" description="Métricas e KPIs estratégicos" icon={<BarChart3 className="h-6 w-6" />} />
  ),
});
