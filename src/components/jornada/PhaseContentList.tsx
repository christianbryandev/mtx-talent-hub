import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JourneyPhase, journeyService } from "@/services/journeyService";
import { ContentItemCard } from "./ContentItemCard";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface PhaseContentListProps {
  phase: JourneyPhase;
  onBack: () => void;
  onSelectItem: (item: any) => void;
}

export function PhaseContentList({ phase, onBack, onSelectItem }: PhaseContentListProps) {
  const { isAdmin } = usePermissions();
  const { user } = useAuth();
  const qc = useQueryClient();
  const phaseNumber = phase.order_index.toString().padStart(2, "0");

  // Modules are the main content units now
  const modules = phase.modules || [];

  // Descobre qual é o módulo mais avançado que o jovem já acessou ou concluiu
  const highestUnlockedIndex = Math.max(
    ...modules.filter(m => m.unlocked || m.completed).map(m => m.order_index),
    0
  );

  const isPhaseCompleted = 
    phase.status?.toLowerCase().includes("conclu") || 
    phase.raw_status?.toLowerCase().includes("conclu");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="p-0 h-auto hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Minha Jornada
        </Button>
        
        <div>
          <span className="text-xs font-bold text-primary tracking-widest uppercase">
            Fase {phaseNumber}
          </span>
          <h2 className="text-3xl font-black text-foreground mt-1">
            {phase.title}
          </h2>
        </div>
      </div>

      {/* List of contents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {modules.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border/60 rounded-lg">
            <p className="text-muted-foreground text-sm">Nenhum conteúdo disponível nesta fase.</p>
          </div>
        ) : (
          modules.map((module, index) => (
            <ContentItemCard
              key={module.id}
              orderIndex={index + 1}
              title={module.title}
              type={module.content_type as any}
              isCompleted={module.completed}
              isLocked={!isAdmin && !module.completed && !module.unlocked && !isPhaseCompleted && module.order_index > highestUnlockedIndex}
              onClick={() => onSelectItem(module)}
              duration={module.duration_minutes ? `${module.duration_minutes}min` : undefined}
              questionsCount={module.content_type === "quiz" ? (module.questions_count || 5) : undefined}
              thumbnailUrl={module.thumbnail_url}
            />
          ))
        )}
      </div>
    </div>
  );
}