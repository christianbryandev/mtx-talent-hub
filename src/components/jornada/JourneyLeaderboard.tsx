import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RankingRow {
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  progress_percentage: number;
  rank_position: number;
}

async function fetchRanking(): Promise<RankingRow[]> {
  const { data, error } = await supabase
    .from("vw_journey_ranking" as never)
    .select("user_id, full_name, first_name, avatar_url, total_xp, progress_percentage, rank_position")
    .order("rank_position", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RankingRow[];
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

const PODIUM_STYLES = [
  { ring: "ring-amber-400/60", bg: "from-amber-500/20 via-background to-background", text: "text-amber-400" },
  { ring: "ring-slate-300/50", bg: "from-slate-400/20 via-background to-background", text: "text-slate-300" },
  { ring: "ring-orange-500/50", bg: "from-orange-500/20 via-background to-background", text: "text-orange-400" },
];

export function JourneyLeaderboard() {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["journey-ranking"],
    queryFn: fetchRanking,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : "Falha ao carregar ranking."}
        </AlertDescription>
      </Alert>
    );
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Ainda não há jovens com XP suficiente para formar um ranking.
        </p>
      </Card>
    );
  }

  const top10 = rows.slice(0, 10);
  const podium = top10.slice(0, 3);
  const rest = top10.slice(3);
  const me = user ? rows.find((r) => r.user_id === user.id) : undefined;
  const meInTop = !!me && me.rank_position <= 10;

  return (
    <div className="space-y-6">
      {/* Pódio */}
      {podium.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {podium.map((row, idx) => {
            const style = PODIUM_STYLES[idx];
            const heights = ["pt-4 pb-6", "pt-6 pb-8", "pt-5 pb-7"]; // visual variation
            return (
              <Card
                key={row.user_id}
                className={`relative bg-gradient-to-b ${style.bg} border-border/60 px-3 ${heights[idx]} text-center`}
              >
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-background border ${style.ring} ring-2 p-1`}>
                  <Medal className={`h-4 w-4 ${style.text}`} />
                </div>
                <Avatar className={`mx-auto mb-2 h-12 w-12 ring-2 ${style.ring}`}>
                  <AvatarImage src={row.avatar_url ?? undefined} />
                  <AvatarFallback>{initials(row.full_name)}</AvatarFallback>
                </Avatar>
                <div className="text-xs font-medium truncate">
                  {row.first_name || row.full_name || "—"}
                </div>
                <div className={`text-lg font-bold tabular-nums ${style.text}`}>
                  {row.total_xp} XP
                </div>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  #{row.rank_position}
                </Badge>
              </Card>
            );
          })}
        </div>
      )}

      {/* Lista 4–10 */}
      {rest.length > 0 && (
        <Card className="divide-y divide-border/60 overflow-hidden">
          {rest.map((row) => (
            <RankRow key={row.user_id} row={row} isMe={row.user_id === user?.id} />
          ))}
        </Card>
      )}

      {/* Posição do usuário (se fora do top 10) */}
      {me && !meInTop && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Sua posição
          </div>
          <Card className="border-primary/40 bg-primary/5">
            <RankRow row={me} isMe highlight />
          </Card>
        </div>
      )}

      {!me && (
        <p className="text-xs text-muted-foreground text-center">
          Faça atividades da jornada para entrar no ranking.
        </p>
      )}
    </div>
  );
}

function RankRow({
  row,
  isMe,
  highlight,
}: {
  row: RankingRow;
  isMe?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        isMe && !highlight ? "bg-primary/5" : ""
      }`}
      aria-current={isMe ? "true" : undefined}
    >
      <div className="w-8 text-center text-sm font-semibold tabular-nums text-muted-foreground">
        #{row.rank_position}
      </div>
      <Avatar className="h-8 w-8">
        <AvatarImage src={row.avatar_url ?? undefined} />
        <AvatarFallback>
          {row.full_name ? initials(row.full_name) : <User className="h-3 w-3" />}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">
          {row.first_name || row.full_name || "—"}
          {isMe && (
            <Badge variant="secondary" className="ml-2 text-[10px]">
              Você
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground tabular-nums" aria-label={`Progresso ${row.progress_percentage}%`}>
          {row.progress_percentage}% concluído
        </div>
      </div>
      <div className="text-sm font-bold tabular-nums">{row.total_xp} XP</div>
    </div>
  );
}
