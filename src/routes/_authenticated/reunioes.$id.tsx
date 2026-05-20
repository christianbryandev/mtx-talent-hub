import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Edit,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { MeetingFormDialog } from "@/components/reunioes/MeetingFormDialog";
import {
  MEETING_STATUS_LABELS,
  MEETING_TYPE_COLOR,
  MEETING_TYPE_LABELS,
  type Meeting,
  type MeetingAgendaItem,
  type MeetingParticipant,
} from "@/types/meetings";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

export const Route = createFileRoute("/_authenticated/reunioes/$id")({
  head: () => ({ meta: [{ title: "Reunião — MTX Hub" }] }),
  component: MeetingDetailPage,
});

function MeetingDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const isOwner = !!user && !!meeting_owner_match(user.id);
  const [editOpen, setEditOpen] = useState(false);
  // Helper inline para evitar nova função
  function meeting_owner_match(_: string) { return false; }

  const { data: meeting, isLoading } = useQuery({
    queryKey: ["meeting", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Meeting;
    },
  });

  const { data: agenda = [] } = useQuery({
    queryKey: ["meeting-agenda", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_agenda_items")
        .select("*")
        .eq("meeting_id", id)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MeetingAgendaItem[];
    },
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["meeting-participants", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_participants")
        .select("*")
        .eq("meeting_id", id);
      if (error) throw error;
      const rows = (data ?? []) as MeetingParticipant[];
      const youngIds = rows.map((r) => r.young_id).filter(Boolean) as string[];
      const profileIds = rows.map((r) => r.profile_id).filter(Boolean) as string[];
      const [youngsRes, profilesRes] = await Promise.all([
        youngIds.length
          ? supabase.from("young_people").select("id, full_name").in("id", youngIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string }[], error: null }),
        profileIds.length
          ? supabase.from("profiles").select("id, full_name, email").in("id", profileIds)
          : Promise.resolve({
              data: [] as { id: string; full_name: string | null; email: string | null }[],
              error: null,
            }),
      ]);
      const youngMap = new Map((youngsRes.data ?? []).map((y) => [y.id, y]));
      const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({
        ...r,
        young: r.young_id ? youngMap.get(r.young_id) ?? null : null,
        profile: r.profile_id ? profileMap.get(r.profile_id) ?? null : null,
      }));
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: "realizada" | "cancelada") => {
      const { error } = await supabase
        .from("meetings")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      if (user) {
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: `meeting_${status}`,
          entity_type: "meeting",
          entity_id: id,
          description: `Reunião marcada como ${status}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting", id] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Status atualizado");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const ataMutation = useMutation({
    mutationFn: async (values: Partial<Meeting>) => {
      const { error } = await supabase.from("meetings").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting", id] });
      toast.success("Ata salva");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/reunioes" })}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
        </Button>
        <p className="text-muted-foreground">Reunião não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/reunioes" })}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para reuniões
      </Button>

      {/* Header */}
      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("border", MEETING_TYPE_COLOR[meeting.type])}>
                  {MEETING_TYPE_LABELS[meeting.type]}
                </Badge>
                <Badge variant="secondary">{MEETING_STATUS_LABELS[meeting.status]}</Badge>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{meeting.title}</h2>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(meeting.date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                {meeting.start_time && ` · ${meeting.start_time.slice(0, 5)}`}
                {meeting.end_time && ` - ${meeting.end_time.slice(0, 5)}`}
                {meeting.location && ` · ${meeting.location}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Edit className="mr-1.5 h-4 w-4" /> Editar
              </Button>
              {meeting.status === "agendada" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => statusMutation.mutate("realizada")}
                    disabled={statusMutation.isPending}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Marcar como realizada
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => statusMutation.mutate("cancelada")}
                    disabled={statusMutation.isPending}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" /> Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <AgendaSection meetingId={id} items={agenda} />
          <AtaSection meeting={meeting} onSave={(v) => ataMutation.mutate(v)} saving={ataMutation.isPending} />
        </div>
        <div className="space-y-4">
          <ParticipantsSection meetingId={id} participants={participants} />
        </div>
      </div>

      <MeetingFormDialog open={editOpen} onOpenChange={setEditOpen} meeting={meeting} />
    </div>
  );
}

function AgendaSection({
  meetingId,
  items,
}: {
  meetingId: string;
  items: MeetingAgendaItem[];
}) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("meeting_agenda_items").insert({
        meeting_id: meetingId,
        title: newTitle,
        position: items.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTitle("");
      queryClient.invalidateQueries({ queryKey: ["meeting-agenda", meetingId] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("meeting_agenda_items")
        .update({ completed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["meeting-agenda", meetingId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meeting_agenda_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["meeting-agenda", meetingId] }),
  });

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader>
        <CardTitle className="text-base">Pauta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item na pauta ainda.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li
                key={it.id}
                className="flex items-start gap-3 rounded-md border border-border/40 bg-background/40 p-2.5"
              >
                <Checkbox
                  checked={it.completed}
                  onCheckedChange={(v) =>
                    toggleMutation.mutate({ id: it.id, completed: !!v })
                  }
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      it.completed && "text-muted-foreground line-through",
                    )}
                  >
                    {i + 1}. {it.title}
                  </p>
                  {it.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{it.description}</p>
                  )}
                  {it.duration_minutes && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {it.duration_minutes} min
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(it.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Separator />
        <div className="flex gap-2">
          <Input
            placeholder="Novo item da pauta"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTitle.trim()) {
                e.preventDefault();
                addMutation.mutate();
              }
            }}
          />
          <Button
            onClick={() => addMutation.mutate()}
            disabled={!newTitle.trim() || addMutation.isPending}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AtaSection({
  meeting,
  onSave,
  saving,
}: {
  meeting: Meeting;
  onSave: (v: Partial<Meeting>) => void;
  saving: boolean;
}) {
  const [objectives, setObjectives] = useState(meeting.objectives ?? "");
  const [decisions, setDecisions] = useState(meeting.decisions ?? "");
  const [nextSteps, setNextSteps] = useState(meeting.next_steps ?? "");
  const [observations, setObservations] = useState(meeting.observations ?? "");

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader>
        <CardTitle className="text-base">Ata da reunião</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Objetivos alcançados
          </label>
          <Textarea rows={2} value={objectives} onChange={(e) => setObjectives(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Decisões tomadas</label>
          <Textarea rows={2} value={decisions} onChange={(e) => setDecisions(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Próximos passos</label>
          <Textarea rows={2} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Observações</label>
          <Textarea rows={2} value={observations} onChange={(e) => setObservations(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={saving}
            onClick={() =>
              onSave({
                objectives: objectives || null,
                decisions: decisions || null,
                next_steps: nextSteps || null,
                observations: observations || null,
              })
            }
          >
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Salvar ata
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ParticipantsSection({
  meetingId,
  participants,
}: {
  meetingId: string;
  participants: (MeetingParticipant & {
    young?: { full_name: string } | null;
    profile?: { full_name: string | null; email: string | null } | null;
  })[];
}) {
  const queryClient = useQueryClient();
  const { data: youngPeople = [] } = useQuery({
    queryKey: ["young-people-light"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("young_people")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (youngId: string) => {
      const { error } = await supabase
        .from("meeting_participants")
        .insert({ meeting_id: meetingId, young_id: youngId });
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["meeting-participants", meetingId] }),
  });

  const presenceMutation = useMutation({
    mutationFn: async ({ id, present }: { id: string; present: boolean }) => {
      const { error } = await supabase
        .from("meeting_participants")
        .update({ present })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["meeting-participants", meetingId] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meeting_participants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["meeting-participants", meetingId] }),
  });

  const existingIds = new Set(participants.map((p) => p.young_id).filter(Boolean) as string[]);
  const available = youngPeople.filter((y) => !existingIds.has(y.id));

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader>
        <CardTitle className="text-base">
          Participantes <span className="text-muted-foreground">({participants.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {participants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum participante adicionado.</p>
        ) : (
          <ul className="space-y-2">
            {participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-md border border-border/40 bg-background/40 p-2"
              >
                <Checkbox
                  checked={!!p.present}
                  onCheckedChange={(v) =>
                    presenceMutation.mutate({ id: p.id, present: !!v })
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {p.young?.full_name ?? p.profile?.full_name ?? p.profile?.email ?? "—"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMutation.mutate(p.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Separator />
        {available.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Adicionar jovem</p>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {available.slice(0, 50).map((y) => (
                <button
                  key={y.id}
                  type="button"
                  onClick={() => addMutation.mutate(y.id)}
                  className="block w-full rounded-md border border-border/40 bg-background/40 p-2 text-left text-sm hover:bg-accent/40"
                >
                  + {y.full_name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Todos os jovens já foram adicionados.</p>
        )}
      </CardContent>
    </Card>
  );
}
