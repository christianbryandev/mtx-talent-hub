import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Plus,
  List as ListIcon,
  CalendarRange,
  Clock,
  MapPin,
} from "lucide-react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MeetingFormDialog } from "@/components/reunioes/MeetingFormDialog";
import {
  MEETING_STATUS_LABELS,
  MEETING_TYPE_COLOR,
  MEETING_TYPE_DOT,
  MEETING_TYPE_LABELS,
  MEETING_TYPE_LIST,
  type Meeting,
} from "@/types/meetings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reunioes/")({
  head: () => ({ meta: [{ title: "Reuniões — MTX Hub" }] }),
  component: ReunioesPage,
});

function ReunioesPage() {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Meeting[];
    },
  });

  const filtered = useMemo(
    () =>
      meetings.filter(
        (m) =>
          (typeFilter === "all" || m.type === typeFilter) &&
          (statusFilter === "all" || m.status === statusFilter),
      ),
    [meetings, typeFilter, statusFilter],
  );

  const today = new Date();
  const upcoming = useMemo(
    () =>
      meetings
        .filter((m) => m.status === "agendada" && parseISO(m.date) >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meetings],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reuniões</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Agenda, pautas e atas de reuniões
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border">
            <Button
              variant={view === "calendar" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("calendar")}
              className="rounded-r-none"
            >
              <CalendarRange className="mr-1.5 h-4 w-4" /> Calendário
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
              className="rounded-l-none"
            >
              <ListIcon className="mr-1.5 h-4 w-4" /> Lista
            </Button>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Nova reunião
          </Button>
        </div>
      </div>

      {upcoming.length > 0 && (
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Próximas reuniões</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((m) => (
              <Link
                key={m.id}
                to="/reunioes/$id"
                params={{ id: m.id }}
                className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/60 p-3 transition-colors hover:bg-accent/40"
              >
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", MEETING_TYPE_DOT[m.type])} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(m.date), "EEE, dd 'de' MMM", { locale: ptBR })}
                    {m.start_time && ` · ${m.start_time.slice(0, 5)}`}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {view === "calendar" ? (
        <CalendarView
          cursor={cursor}
          setCursor={setCursor}
          meetings={filtered}
          isLoading={isLoading}
        />
      ) : (
        <ListView
          meetings={filtered}
          isLoading={isLoading}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
      )}

      <MeetingFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CalendarView({
  cursor,
  setCursor,
  meetings,
  isLoading,
}: {
  cursor: Date;
  setCursor: (d: Date) => void;
  meetings: Meeting[];
  isLoading: boolean;
}) {
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = new Date(d.getTime() + 86400000)) {
    days.push(new Date(d));
  }

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of meetings) {
      const key = m.date;
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return map;
  }, [meetings]);

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base capitalize">
          {format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
        </CardTitle>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, -1))}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, 1))}>
            Próximo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="grid grid-cols-7 gap-1 text-xs">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="py-2 text-center font-semibold text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayMeetings = meetingsByDay.get(key) ?? [];
              const inMonth = isSameMonth(day, cursor);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-24 rounded-md border border-border/50 bg-background/40 p-1.5",
                    !inMonth && "opacity-40",
                    isToday && "border-primary/60 bg-primary/5",
                  )}
                >
                  <div className="mb-1 text-[11px] font-semibold text-muted-foreground">
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayMeetings.slice(0, 3).map((m) => (
                      <Link
                        key={m.id}
                        to="/reunioes/$id"
                        params={{ id: m.id }}
                        className={cn(
                          "block truncate rounded px-1.5 py-0.5 text-[10px] font-medium border",
                          MEETING_TYPE_COLOR[m.type],
                        )}
                        title={m.title}
                      >
                        {m.start_time ? `${m.start_time.slice(0, 5)} ` : ""}
                        {m.title}
                      </Link>
                    ))}
                    {dayMeetings.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{dayMeetings.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ListView({
  meetings,
  isLoading,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
}: {
  meetings: Meeting[];
  isLoading: boolean;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
}) {
  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Reuniões</CardTitle>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {MEETING_TYPE_LIST.map((t) => (
                <SelectItem key={t} value={t}>
                  {MEETING_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="agendada">Agendada</SelectItem>
              <SelectItem value="realizada">Realizada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
            <CalendarDays className="h-8 w-8" />
            <p className="text-sm">Nenhuma reunião encontrada</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.map((m) => (
                <TableRow key={m.id} className="cursor-pointer">
                  <TableCell>
                    <Link to="/reunioes/$id" params={{ id: m.id }} className="font-medium hover:underline">
                      {m.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("border", MEETING_TYPE_COLOR[m.type])}>
                      {MEETING_TYPE_LABELS[m.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(parseISO(m.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.start_time ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {m.start_time.slice(0, 5)}
                        {m.end_time && ` - ${m.end_time.slice(0, 5)}`}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {m.location}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {MEETING_STATUS_LABELS[m.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
