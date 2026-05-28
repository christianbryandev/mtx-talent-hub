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
  const { data, isLoading, isError, error, isFetching } = useJourney();
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [activeQuizPhaseId, setActiveQuizPhaseId] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<JourneyModule | null>(null);



  useEffect(() => {
    if (!selectedPhaseId && !activeQuizPhaseId) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedPhaseId, activeQuizPhaseId]);


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
  const qc = useQueryClient();
  const { user } = useAuth();

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
            <div className="grid grid-cols-2 gap-4">

              {data.phases.map((phase) => (
                <PhaseGridCard
                  key={phase.id}
                  phase={phase}
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
    </div>
  );
}
