import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MEETING_TYPE_LABELS, type MeetingType } from "@/types/meetings";

export function TodayMeetingBanner() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const { data: meetings = [] } = useQuery({
    queryKey: ["today-meetings", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data: parts } = await supabase
        .from("meeting_participants")
        .select("meeting_id")
        .eq("profile_id", user!.id);
      const ids = (parts ?? []).map((p) => p.meeting_id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("meetings")
        .select("id, title, type, start_time, date")
        .in("id", ids)
        .eq("date", today)
        .order("start_time", { ascending: true });
      return data ?? [];
    },
  });

  if (meetings.length === 0) return null;

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
      {meetings.map((m) => (
        <Link
          key={m.id}
          to="/reunioes"
          className="flex items-center gap-3 py-1 hover:underline"
        >
          <Calendar className="h-5 w-5 text-primary" />
          <span className="text-sm">
            📅 Você tem uma reunião hoje:{" "}
            <strong>{m.title}</strong>{" "}
            <span className="text-muted-foreground">
              ({MEETING_TYPE_LABELS[m.type as MeetingType]})
            </span>{" "}
            {m.start_time && <span>às {m.start_time.slice(0, 5)}</span>} — Ver detalhes
          </span>
        </Link>
      ))}
    </div>
  );
}
