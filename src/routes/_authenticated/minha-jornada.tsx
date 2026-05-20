import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ArrowRight, Users } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { JourneyKanban } from "@/components/jornada/JourneyKanban";
import { YoungSearchSelect } from "@/components/shared/YoungSearchSelect";

export const Route = createFileRoute("/_authenticated/minha-jornada")({
  head: () => ({ meta: [{ title: "Minha Jornada — MTX Hub" }] }),
  component: MyJourneyPage,
});

function MyJourneyPage() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const [adminSelectedYoung, setAdminSelectedYoung] = useState<string | null>(null);

  const { data: ownYoung, isLoading } = useQuery({
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

  const { data: selectedYoungInfo } = useQuery({
    queryKey: ["young-info", adminSelectedYoung],
    enabled: !!adminSelectedYoung,
    queryFn: async () => {
      const { data } = await supabase
        .from("young_people")
        .select("id, full_name, trail_phase")
        .eq("id", adminSelectedYoung!)
        .maybeSingle();
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

  // Para admin: prioriza o jovem selecionado; senão usa o próprio (se houver).
  const activeYoung = isAdmin && adminSelectedYoung ? selectedYoungInfo : ownYoung;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAdmin && adminSelectedYoung && activeYoung
              ? `Jornada de ${activeYoung.full_name}`
              : "Minha Jornada"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe e organize cada fase da trilha MTX.
          </p>
        </div>
        {isAdmin && (
          <div className="w-full sm:w-72 space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Visualizar jornada de
            </div>
            <YoungSearchSelect
              value={adminSelectedYoung}
              onChange={setAdminSelectedYoung}
              placeholder={ownYoung ? "Minha jornada (padrão)" : "Selecione um jovem"}
            />
          </div>
        )}
      </div>

      {!activeYoung ? (
        <div className="text-center py-16 space-y-4">
          <Sparkles className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h2 className="text-xl font-semibold">
              {isAdmin
                ? "Selecione um jovem acima para visualizar sua jornada"
                : "Sua jornada ainda não foi iniciada"}
            </h2>
            {!isAdmin && (
              <p className="text-sm text-muted-foreground mt-1">
                Complete seu perfil para começar a trilha MTX.
              </p>
            )}
          </div>
          {!isAdmin && (
            <Button asChild>
              <Link to="/meu-perfil">
                Ir para meu perfil <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <JourneyKanban
          key={activeYoung.id}
          youngId={activeYoung.id}
          canEdit={isAdmin}
          canReassign={isAdmin}
        />
      )}
    </div>
  );
}
