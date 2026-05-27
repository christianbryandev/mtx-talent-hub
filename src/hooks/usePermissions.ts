import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { AppRole } from "@/types";
import { ROLE_PRECEDENCE } from "@/types";

export function usePermissions() {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [] as AppRole[];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  // primary role by precedence
  const role: AppRole | null =
    ROLE_PRECEDENCE.find((r) => roles.includes(r)) ?? null;

  const hasRole = (allowed: AppRole | AppRole[]) => {
    const list = Array.isArray(allowed) ? allowed : [allowed];
    return roles.some((r) => list.includes(r));
  };

  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = isSuperAdmin || roles.includes("admin");
  const isComercial = isAdmin || roles.includes("comercial");
  const isJovemAprendiz = roles.includes("jovem_aprendiz");

  return {
    roles,
    role,
    hasRole,
    isSuperAdmin,
    isAdmin,
    isComercial,
    isJovemAprendiz,
    loading: isLoading,
  };
}
