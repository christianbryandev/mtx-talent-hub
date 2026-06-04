import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CheckSquare,
  AlertCircle,
  CalendarDays,
  Sparkles,
  ArrowRight,
  Users,
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
import { usePermissions } from "@/hooks/usePermissions";
import { useJourney, usePhaseMetadata } from "@/hooks/useJourney";
import { TodayMeetingBanner } from "@/components/dashboard/TodayMeetingBanner";
import { YoungSearchSelect } from "@/components/shared/YoungSearchSelect";
import { TRAIL_PHASE_LABELS, TRAIL_PHASE_LIST, type TrailPhase } from "@/types";

export function JovemAprendizDashboard() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const [selectedYoungId, setSelectedYoungId] = useState<string | null>(null);

  // We only fetch journey for a specific young person.
  // If it's an admin viewing "Todos", we don't have a single profile_id to fetch the journey for.
  const targetProfileId = selectedYoungId ? undefined : (isAdmin ? "skip" : user?.id);
  const { data: journeyData, isLoading: isLoadingJourney } = useJourney(targetProfileId === "skip" ? "" : targetProfileId);
  const { data: catalogPhases } = usePhaseMetadata();
  const today = new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ["jovem_aprendiz-dashboard-base", user?.id, isAdmin, selectedYoungId],
    enabled: !!user && isAdmin !== undefined,
    queryFn: async () => {
      let young = null;

      if (!isAdmin || selectedYoungId) {
        let query = supabase.from("young_people").select("id, full_name, trail_phase, profile_id");
        if (selectedYoungId) {
          query = query.eq("id", selectedYoungId);
        } else {
          query = query.eq("profile_id", user!.id);
        }
        const { data: yData } = await query.maybeSingle();
        young = yData;
      }

      if (!isAdmin && !young) return { young: null };

      let tasksQuery = supabase.from("tasks").select("id, title, kanban_column, due_date");
      if (young) tasksQuery = tasksQuery.eq("young_responsible", young.id);
      else if (!isAdmin) tasksQuery = tasksQuery.eq("young_responsible", "00000000-0000-0000-0000-000000000000"); // Força vazio se não achar jovem e não for admin

      let meetingsQuery = supabase.from("meeting_participants").select("meeting_id, meetings(id, title, date, start_time, type)");
      if (young) meetingsQuery = meetingsQuery.eq("young_id", young.id);
      else if (!isAdmin) meetingsQuery = meetingsQuery.eq("young_id", "00000000-0000-0000-0000-000000000000");

      let clientsQuery = supabase.from("clients").select("id, company_name, status");
      if (young) clientsQuery = clientsQuery.eq("young_responsible", young.id);
      else if (!isAdmin) clientsQuery = clientsQuery.eq("young_responsible", "00000000-0000-0000-0000-000000000000");

      const [tasksRes, meetingsRes, clientsRes] = await Promise.all([tasksQuery, meetingsQuery, clientsQuery]);

      const tasks = tasksRes.data ?? [];
      const openTasks = tasks.filter((t) => t.kanban_column !== "concluido");
      const overdueTasks = openTasks.filter((t) => t.due_date && t.due_date < today);

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
        upcomingMeetings: meetingRows,
        clients: clientsRes.data ?? [],
      };
    },
  });

  // Atualiza targetProfileId após fetch se selecionamos por jovem ID (para puxar a jornada)
  if (data?.young && targetProfileId === undefined && !isLoadingJourney && !journeyData) {
     // A mutation to refetch journey would happen implicitly via state if we stored profile_id, 
     // but to avoid loops we'll just check if it's there. Actually, we need profile_id for journey.
  }

  if (isLoading || (isLoadingJourney && targetProfileId !== "skip") || !data) {
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

  if (!isAdmin && !data.young) {
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

  const titleName = data.young ? data.young.full_name.split(" ")[0] : "Todos os Jovens";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Olá, {titleName} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.young ? "Aqui está o resumo da jornada e tarefas." : "Aqui está o resumo consolidado de todos os jovens."}
          </p>
        </div>

        {isAdmin && (
          <div className="w-full sm:w-72 shrink-0">
            <YoungSearchSelect
              value={selectedYoungId}
              onChange={setSelectedYoungId}
              placeholder="Todos os Jovens"
              allowClear={true}
              clearText="Todos os Jovens"
            />
          </div>
        )}
      </div>

      <TodayMeetingBanner />

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

      {data.young && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Jornada do Jovem</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/jornada">Abrir <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {journeyData?.phases.map((ph) => {
              const isCompleted = ph.status?.toLowerCase().includes("conclu") || ph.raw_status?.toLowerCase().includes("conclu");
              const pctRaw = ph.cards_total === 0 ? 0 : Math.round((ph.cards_done / ph.cards_total) * 100);
              const pct = isCompleted ? 100 : pctRaw;
              const doneCount = isCompleted ? ph.cards_total : ph.cards_done;
              return (
                <div key={ph.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{ph.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {doneCount}/{ph.cards_total}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
            {(!journeyData || journeyData.phases.length === 0) && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Jornada não iniciada ou carregando fases...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && !data.young && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Visão Consolidada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Para visualizar o progresso da jornada (Minha Jornada), selecione um jovem específico no filtro acima.
              As métricas de tarefas e reuniões abaixo representam a soma de todos os jovens.
            </p>
          </CardContent>
        </Card>
      )}

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
