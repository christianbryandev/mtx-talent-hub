import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/_authenticated/reunioes")({
  head: () => ({ meta: [{ title: "Reuniões — MTX Hub" }] }),
  component: () => (
    <ComingSoon title="Reuniões" description="Agenda e histórico de reuniões" icon={<CalendarDays className="h-6 w-6" />} />
  ),
});
