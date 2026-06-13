import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";

const COMPLETION_FIELDS = [
  "photo_url", "birth_date", "cpf", "phone", "whatsapp", "address", "city", "state", "zip_code",
  "mother_name", "education_level", "school", "current_situation",
  "testimony", "dreams", "skills", "interest_area", "availability", "pix_key",
];

export function IncompleteProfileBanner() {
  const { user } = useAuth();
  const { isAdmin, loading } = usePermissions();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem("mtx-incomplete-dismissed") === "1");
  }, []);

  const { data } = useQuery({
    queryKey: ["my-young-completion", user?.id],
    enabled: !!user && !isAdmin && !loading,
    queryFn: async () => {
      const { data } = await supabase
        .from("young_people")
        .select(COMPLETION_FIELDS.join(","))
        .eq("profile_id", user!.id)
        .maybeSingle();
      if (!data) return null;
      const filled = COMPLETION_FIELDS.filter((f) => {
        const v = (data as any)[f];
        return v !== null && v !== undefined && v !== "";
      }).length;
      return Math.round((filled / COMPLETION_FIELDS.length) * 100);
    },
  });

  if (isAdmin || loading || dismissed || data == null || data >= 70) return null;

  return (
    <div className="flex items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
      <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
      <p className="flex-1 text-sm">
        Seu perfil está <strong>{data}% completo</strong>. Complete agora para que sua equipe te conheça melhor!
      </p>
      <Button size="sm" asChild variant="default">
        <Link to="/meu-perfil">Completar perfil</Link>
      </Button>
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem("mtx-incomplete-dismissed", "1");
          setDismissed(true);
        }}
        className="rounded-md p-1 text-muted-foreground hover:bg-background/50"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
