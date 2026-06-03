import { createFileRoute, Link } from "@tanstack/react-router";

import {
  Lock,
  CheckCircle2,
  Circle,
  Sparkles,
  XCircle,
  HelpCircle,
  Loader2,
  ExternalLink,
  Paperclip,
  BookOpen,
  Target,
  Trophy,
  Award,
  Zap,
  GraduationCap,
  ArrowRight,
  Rocket,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useJourney } from "@/hooks/useJourney";
import { usePermissions } from "@/hooks/usePermissions";
import { startUserJourney } from "@/utils/journeySeed";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { externalLinkProps, normalizeExternalUrl } from "@/lib/external-url";
import type { JourneyPhase, PhaseStatus, UserJourney, JourneyModule } from "@/services/journeyService";
import { QuizCard } from "@/components/jornada/QuizCard";
import {
  AchievementsSection,
  JourneyCompletedBanner,
} from "@/components/jornada/AchievementsSection";
import { JourneyLeaderboard } from "@/components/jornada/JourneyLeaderboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhaseGridCard } from "@/components/jornada/PhaseGridCard";
import { PhaseContentList } from "@/components/jornada/PhaseContentList";
import { QuizView } from "@/components/jornada/QuizView";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";



export const Route = createFileRoute("/_authenticated/jornada")({
  head: () => ({ meta: [{ title: "Jornada — MTX Hub" }] }),
  component: JourneyPage,
});

function JourneyPage() {
  const { isAdmin } = usePermissions();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading, isError, error, isFetching } = useJourney();
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [activeQuizPhaseId, setActiveQuizPhaseId] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<JourneyModule | null>(null);
  const [moduleLinks, setModuleLinks] = useState<any[]>([]);

  useEffect(() => {
    if (selectedModule) {
      supabase.from('journey_modules').select('links').eq('id', selectedModule.id).single()
        .then(({ data }) => {
          if (data && data.links) {
            setModuleLinks(data.links as any[]);
          } else {
            setModuleLinks([]);
          }
        });
    } else {
      setModuleLinks([]);
    }
  }, [selectedModule]);

  useEffect(() => {
    if (!selectedPhaseId && !activeQuizPhaseId) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedPhaseId, activeQuizPhaseId]);

  const completeModule = async (moduleId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("user_module_progress")
        .upsert({ 
          user_id: user.id, 
          module_id: moduleId, 
          completed: true, 
          completed_at: new Date().toISOString() 
        }, { onConflict: "user_id,module_id" });
      
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["journey"] });
    } catch (err) {
      console.error("Error marking module as completed", err);
    }
  };

  const phasesDone = useMemo(
    () => (data ? data.phases.filter((p) => p.status === "concluida").length : 0),
    [data],
  );

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  if (isError)
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível carregar a jornada. Tente novamente em instantes.
          {error instanceof Error && (
            <span className="block text-xs opacity-70 mt-1">{error.message}</span>
          )}
        </AlertDescription>
      </Alert>
    );

  if (!data) return <p className="text-muted-foreground">Sem dados.</p>;

  if (data.phases.length === 0) {
    return (
      <Card className="p-8 text-center flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold mb-2">Jornada ainda não configurada</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {isAdmin 
            ? "Você pode começar populando o catálogo de fases no painel administrativo." 
            : "Peça a um administrador para popular o catálogo de fases."}
        </p>
        {isAdmin && (
          <Button asChild>
            <Link to="/admin/journey-catalog">Configurar Jornada</Link>
          </Button>
        )}
      </Card>
    );
  }



  const selectedPhase = data.phases.find((p) => p.id === selectedPhaseId);

  return (
    <div className="space-y-6">
      {!selectedPhase ? (
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Minha Jornada
              {isFetching && (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground inline ml-2" />
              )}
            </h1>
          </div>
          <div className="text-right">
            <Badge
              variant="outline"
              className="font-bold border-primary/30 text-primary bg-primary/5 px-3 py-1"
            >
              {phasesDone} de {data.phases.length} fases
            </Badge>
          </div>
        </header>
      ) : null}

      <Tabs defaultValue="trilha" className="w-full">
        {!selectedPhase && (
          <TabsList>
            <TabsTrigger value="trilha">Trilha</TabsTrigger>
            <TabsTrigger value="conquistas">
              <Award className="h-3.5 w-3.5 mr-1.5" /> Conquistas
            </TabsTrigger>
            <TabsTrigger value="ranking">
              <Trophy className="h-3.5 w-3.5 mr-1.5" /> Ranking
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="trilha" className={`${!selectedPhase && !activeQuizPhaseId ? "mt-6" : ""}`}>
          {activeQuizPhaseId ? (
            <QuizView 
              phaseId={activeQuizPhaseId} 
              onClose={(passed) => {
                setActiveQuizPhaseId(null);
                if (passed) {
                  // If passed, user goes back to phase list or stays in same phase
                  // Already handled by service invalidating journey
                }
              }}
            />
          ) : selectedPhase ? (
            <PhaseContentList
              phase={selectedPhase}
              onBack={() => setSelectedPhaseId(null)}
              onSelectItem={(module) => {
                if (module.content_type === "quiz") {
                  setActiveQuizPhaseId(selectedPhase.id);
                } else {
                  setSelectedModule(module);
                }
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.phases.map((phase) => (
                <PhaseGridCard
                  key={phase.id}
                  phase={phase}
                  lockCompleted={!isAdmin}
                  onClick={(p) => setSelectedPhaseId(p.id)}
                />
              ))}
            </div>

          )}
        </TabsContent>


        <TabsContent value="conquistas" className="space-y-6 mt-4">
          <JourneyCompletedBanner journey={data} />
          <AchievementsSection journey={data} />
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <JourneyLeaderboard />
        </TabsContent>
      </Tabs>
      {/* Modal de Vídeo */}
      <Dialog open={!!selectedModule} onOpenChange={(open) => !open && setSelectedModule(null)}>
        <DialogContent className={`p-0 overflow-hidden bg-background border-none shadow-2xl sm:rounded-2xl ${selectedModule?.content_type === 'texto' ? 'max-w-3xl max-h-[90vh]' : 'max-w-4xl bg-black'}`}>
          {selectedModule && (
            <div className="flex flex-col">
              <DialogHeader className="p-4 bg-background border-b border-border/10">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] h-4">
                    {selectedModule.content_type === "video" ? "AULA" : "LEITURA"}
                  </Badge>
                  {selectedModule.title}
                </DialogTitle>
              </DialogHeader>
              
              {selectedModule.content_type === "video" ? (
                <div className="aspect-video w-full bg-muted flex items-center justify-center relative group">
                  {selectedModule.content_body ? (
                    <video 
                      src={selectedModule.content_body} 
                      controls 
                      autoPlay 
                      className="w-full h-full"
                      onEnded={() => {
                        completeModule(selectedModule.id);
                        toast.success("Aula concluída! Próximo item liberado.");
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <XCircle className="h-10 w-10 opacity-20" />
                      <p className="text-sm">Vídeo não disponível ou URL inválida.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 overflow-y-auto max-h-[60vh] bg-background">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {selectedModule.content_body ? (
                      <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                        {selectedModule.content_body}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic text-center py-12">
                        Nenhum conteúdo de texto cadastrado.
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {moduleLinks && moduleLinks.length > 0 && (
                <div className="p-4 bg-background border-t border-border/10">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-primary" />
                    Materiais de Apoio
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {moduleLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={normalizeExternalUrl(link.url)}
                        {...externalLinkProps}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-sm rounded-md transition-colors border border-border/50"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-background border-t border-border/10 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Conteúdo da Fase</span>
                  <span className="text-sm font-medium">{selectedPhase?.title}</span>
                </div>
                <Button 
                  onClick={() => {
                    completeModule(selectedModule.id);
                    setSelectedModule(null);
                    toast.success(selectedModule.content_type === "video" ? "Aula concluída!" : "Leitura concluída!");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {selectedModule.content_type === "video" ? "Marcar como assistida" : "Concluir leitura"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

