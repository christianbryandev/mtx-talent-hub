import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { JourneyKanban } from "@/components/jornada/JourneyKanban";

export const Route = createFileRoute("/_authenticated/minha-jornada")({
  head: () => ({ meta: [{ title: "Minha Jornada — MTX Hub" }] }),
  component: MyJourneyPage,
});

function MyJourneyPage() {
  const { user } = useAuth();

  const { data: young, isLoading } = useQuery({
    queryKey: ["my-young", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("young_people")
        .select("id, full_name, trail_phase")
        .eq("profile_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!young) {
    return (
      <div className="text-center py-16 space-y-4">
        <Sparkles className="h-12 w-12 text-muted-foreground mx-auto" />
        <div>
          <h1 className="text-xl font-semibold">Sua jornada ainda não foi iniciada</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete seu perfil para começar a trilha MTX.
          </p>
        </div>
        <Button asChild>
          <Link to="/meu-perfil">Ir para meu perfil <ArrowRight className="h-4 w-4 ml-1" /></Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Minha Jornada</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe e organize cada fase da sua trilha MTX.
        </p>
      </div>
      <JourneyKanban youngId={young.id} canEdit />
    </div>
  );
}
