import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Film,
  Video,
  PlayCircle,
  Search,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/journey-media")({
  head: () => ({ meta: [{ title: "Admin · Mídia da Jornada — MTX Hub" }] }),
  component: AdminJourneyMediaPage,
  ssr: false,
});

interface CatalogPhase {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  status: string | null;
}

interface VideoModule {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  content_body: string | null;
  order_index: number;
  thumbnail_url: string | null;
  duration_minutes: number | null;
}

interface PhaseWithVideos extends CatalogPhase {
  videos: VideoModule[];
}

function AdminJourneyMediaPage() {
  const { isAdmin, loading: permLoading } = usePermissions();
  const [search, setSearch] = useState("");
  const [activeVideo, setActiveVideo] = useState<VideoModule | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-journey-media"],
    enabled: isAdmin,
    queryFn: async (): Promise<PhaseWithVideos[]> => {
      const [{ data: phases, error: phasesError }, { data: modules, error: modulesError }] =
        await Promise.all([
          supabase
            .from("journey_phase_catalog")
            .select("id, title, description, order_index, status")
            .order("order_index", { ascending: true }),
          supabase
            .from("journey_modules")
            .select(
              "id, phase_id, title, description, content_body, order_index, thumbnail_url, duration_minutes, content_type",
            )
            .eq("content_type", "video")
            .order("order_index", { ascending: true }),
        ]);

      if (phasesError) throw phasesError;
      if (modulesError) throw modulesError;

      const byPhase = new Map<string, VideoModule[]>();
      for (const m of (modules ?? []) as VideoModule[]) {
        const list = byPhase.get(m.phase_id) ?? [];
        list.push(m);
        byPhase.set(m.phase_id, list);
      }

      return ((phases ?? []) as CatalogPhase[]).map((p) => ({
        ...p,
        videos: byPhase.get(p.id) ?? [],
      }));
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data
      .map((phase) => {
        const phaseMatches = phase.title.toLowerCase().includes(q);
        const videos = phaseMatches
          ? phase.videos
          : phase.videos.filter((v) => v.title.toLowerCase().includes(q));
        return { ...phase, videos };
      })
      .filter((phase) => phase.title.toLowerCase().includes(q) || phase.videos.length > 0);
  }, [data, search]);

  const totalVideos = useMemo(
    () => (data ?? []).reduce((acc, p) => acc + p.videos.length, 0),
    [data],
  );

  if (permLoading) return <Skeleton className="h-64 w-full" />;
  if (!isAdmin) return <Navigate to="/dashboard" />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Film className="h-6 w-6 text-primary" />
            Mídia da Jornada
          </h1>
          <p className="text-sm text-muted-foreground">
            Navegue pelas fases e reproduza os vídeos associados a cada uma.
          </p>
        </div>
        {!isLoading && data && (
          <Badge variant="outline" className="font-semibold">
            {totalVideos} vídeo{totalVideos === 1 ? "" : "s"} em {data.length} fases
          </Badge>
        )}
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por fase ou vídeo..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState message="Não foi possível carregar a mídia da jornada." />
      ) : filtered.length === 0 ? (
        <EmptyState message="Nenhuma fase ou vídeo encontrado." />
      ) : (
        <div className="space-y-3">
          {filtered.map((phase) => (
            <PhaseRow key={phase.id} phase={phase} onPlay={setActiveVideo} />
          ))}
        </div>
      )}

      <Dialog open={!!activeVideo} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent className="max-w-4xl overflow-hidden p-0">
          {activeVideo && (
            <>
              <DialogHeader className="border-b border-border/40 p-4">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Video className="h-4 w-4 text-primary" />
                  {activeVideo.title}
                </DialogTitle>
              </DialogHeader>
              <div className="aspect-video w-full bg-black">
                {activeVideo.content_body ? (
                  <video
                    src={activeVideo.content_body}
                    controls
                    autoPlay
                    className="h-full w-full"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <XCircle className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Vídeo não disponível ou URL inválida.</p>
                  </div>
                )}
              </div>
              {activeVideo.description && (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  {activeVideo.description}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhaseRow({
  phase,
  onPlay,
}: {
  phase: PhaseWithVideos;
  onPlay: (video: VideoModule) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasVideos = phase.videos.length > 0;
  const phaseNumber = phase.order_index.toString().padStart(2, "0");

  return (
    <Card className="overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40">
            {open ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Fase {phaseNumber}
            </span>
            <span className="flex-1 truncate font-semibold">{phase.title}</span>
            {phase.status === "publicado" && (
              <Badge variant="outline" className="gap-1 text-emerald-500">
                <CheckCircle2 className="h-3 w-3" /> Publicada
              </Badge>
            )}
            <Badge variant={hasVideos ? "default" : "secondary"} className="gap-1">
              <Video className="h-3 w-3" />
              {phase.videos.length}
            </Badge>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="border-t border-border/40 pt-4">
            {!hasVideos ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Esta fase ainda não possui vídeos.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {phase.videos.map((video) => (
                  <VideoCard key={video.id} video={video} onPlay={onPlay} />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function VideoCard({
  video,
  onPlay,
}: {
  video: VideoModule;
  onPlay: (video: VideoModule) => void;
}) {
  return (
    <button
      onClick={() => onPlay(video)}
      className="group flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card text-left transition-all hover:border-primary/50 hover:shadow-md"
    >
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <Video className="h-10 w-10 text-muted-foreground/40" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          <PlayCircle className="h-12 w-12 text-white drop-shadow-lg" />
        </div>
      </div>
      <div className="flex flex-col gap-1 p-3">
        <span className="line-clamp-2 text-sm font-medium">{video.title}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {video.duration_minutes ? (
            <span>{video.duration_minutes} min</span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Vídeo
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
      <Film className="h-8 w-8 opacity-30" />
      {message}
    </div>
  );
}
