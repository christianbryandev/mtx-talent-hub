import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CheckSquare,
  AlertCircle,
  CalendarDays,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { TRAIL_PHASE_LABELS, TRAIL_PHASE_LIST, type TrailPhase } from "@/types";

export function ColaboradorDashboard() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ["colaborador-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: young } = await supabase
        .from("young_people")
        .select("id, full_name, trail_phase")
        .eq("profile_id", user!.id)
        .maybeSingle();

      if (!young) return { young: null };

      const [tasksRes, journeyRes, meetingsRes, clientsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, kanban_column, due_date")
          .eq("young_responsible", young.id),
        supabase
          .from("journey_phases")
          .select("id, phase, status")
          .eq("young_id", young.id),
        supabase
          .from("meeting_participants")
          .select("meeting_id, meetings(id, title, date, start_time, type)")
          .eq("young_id", young.id)
          .limit(20),
        supabase
          .from("clients")
          .select("id, company_name, status")
          .eq("young_responsible", young.id),
      ]);

      const tasks = tasksRes.data ?? [];
      const openTasks = tasks.filter(
        (t) => t.kanban_column !== "concluido",
      );
      const overdueTasks = openTasks.filter(
        (t) => t.due_date && t.due_date < today,
      );

      const journey = journeyRes.data ?? [];
      const byPhase: Record<string, { total: number; done: number }> = {};
      TRAIL_PHASE_LIST.forEach((p) => {
        byPhase[p] = { total: 0, done: 0 };
      });
      journey.forEach((j) => {
        if (byPhase[j.phase]) {
          byPhase[j.phase].total += 1;
          if (j.status === "concluida") byPhase[j.phase].done += 1;
        }
      });

      const meetingRows = (meetingsRes.data ?? [])
        .map((m) => m.meetings)
        .filter(Boolean)
        .filter((m): m is { id: string; title: string; date: string; start_time: string | null; type: string } =>
          m !== null && m.date >= today,
        )
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5);

      return {
        young,
        openCount: openTasks.length,
        overdueCount: overdueTasks.length,
        upcomingTasks: openTasks
          .filter((t) => t.due_date)
          .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
          .slice(0, 5),
        byPhase,
        upcomingMeetings: meetingRows,
        clients: clientsRes.data ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data.young) {
    return (
      <div className="text-center py-16 space-y-4">
        <Sparkles className="h-12 w-12 text-muted-foreground mx-auto" />
        <div>
          <h1 className="text-xl font-semibold">Bem-vindo(a) ao MTX Hub!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete seu perfil de jovem para acessar tarefas, jornada e mais.
          </p>
        </div>
        <Button asChild>
          <Link to="/meu-perfil">Completar meu perfil <ArrowRight className="h-4 w-4 ml-1" /></Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {data.young.full_name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Aqui está o resumo da sua jornada na MTX.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard icon={<CheckSquare className="h-5 w-5" />} label="Tarefas abertas" value={data.openCount.toString()} />
        <KpiCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Tarefas atrasadas"
          value={data.overdueCount.toString()}
          accent={data.overdueCount > 0 ? "warning" : "primary"}
        />
        <KpiCard icon={<CalendarDays className="h-5 w-5" />} label="Próximas reuniões" value={data.upcomingMeetings.length.toString()} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Minha jornada</CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link to="/minha-jornada">Abrir <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {TRAIL_PHASE_LIST.map((p) => {
            const { total, done } = data.byPhase[p];
            const pct = total === 0 ? 0 : Math.round((done / total) * 100);
            return (
              <div key={p} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{TRAIL_PHASE_LABELS[p as TrailPhase]}</span>
                  <span className="text-xs text-muted-foreground">
                    {done}/{total}
                  </span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Próximas tarefas</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/tarefas">Ver todas <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente com prazo 🎉</p>
            ) : (
              <ul className="space-y-2">
                {data.upcomingTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{t.title}</span>
                    <Badge variant={t.due_date && t.due_date < today ? "destructive" : "secondary"}>
                      {t.due_date ? format(parseISO(t.due_date), "dd/MM", { locale: ptBR }) : "—"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximas reuniões</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma reunião agendada.</p>
            ) : (
              <ul className="space-y-2">
                {data.upcomingMeetings.map((m) => (
                  <li key={m.id}>
                    <Link
                      to="/reunioes/$id"
                      params={{ id: m.id }}
                      className="flex items-center justify-between text-sm hover:bg-muted/50 rounded p-2 -mx-2"
                    >
                      <span className="truncate">{m.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(parseISO(m.date), "dd/MM", { locale: ptBR })}
                        {m.start_time ? ` ${m.start_time.slice(0, 5)}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {data.clients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clientes sob minha responsabilidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.clients.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/clientes/$id"
                    params={{ id: c.id }}
                    className="flex items-center justify-between text-sm hover:bg-muted/50 rounded p-2 -mx-2"
                  >
                    <span className="truncate">{c.company_name}</span>
                    <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
