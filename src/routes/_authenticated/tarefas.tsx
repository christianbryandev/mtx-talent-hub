import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — MTX Hub" }] }),
  component: () => (
    <ComingSoon title="Tarefas / Kanban" description="Quadro de tarefas da operação" icon={<ListChecks className="h-6 w-6" />} />
  ),
});
