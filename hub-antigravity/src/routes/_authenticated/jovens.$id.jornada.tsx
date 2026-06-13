import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { JourneyKanban } from "@/components/jornada/JourneyKanban";

export const Route = createFileRoute("/_authenticated/jovens/$id/jornada")({
  head: () => ({ meta: [{ title: "Jornada do jovem — MTX Hub" }] }),
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const allowed = (roles ?? []).some((r) =>
      r.role === "super_admin" || r.role === "admin",
    );
    if (!allowed) throw redirect({ to: "/dashboard" });
  },
  component: AdminJourneyPage,
});

function AdminJourneyPage() {
  const { id } = Route.useParams();

  const { data: young, isLoading } = useQuery({
    queryKey: ["young-min", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("young_people")
        .select("id, full_name, trail_phase")
        .eq("id", id)
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
      <div className="text-center py-12">
        <p className="text-muted-foreground">Jovem não encontrado.</p>
        <Button asChild variant="link">
          <Link to="/jovens">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/jovens/$id" params={{ id }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao perfil
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Jornada de {young.full_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Edite, adicione e reorganize cards da trilha do jovem.
        </p>
      </div>
      <JourneyKanban youngId={young.id} canEdit canReassign />
    </div>
  );
}
