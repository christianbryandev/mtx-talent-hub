import { createFileRoute } from "@tanstack/react-router";
import { JourneyMonitor } from "@/components/admin/JourneyMonitor";

export const Route = createFileRoute("/_authenticated/admin/journey-monitor")({
  component: JourneyMonitorPage,
});

function JourneyMonitorPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Monitor da Jornada</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhamento operacional individual por jovem: progresso, fase, quizzes e atividade.
        </p>
      </header>
      <JourneyMonitor />
    </div>
  );
}
