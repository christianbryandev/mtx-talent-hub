import { supabase } from "@/integrations/supabase/client";

export interface LogActivityInput {
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  description?: string | null;
}

/**
 * Registra uma ação na tabela activity_logs.
 * Falha silenciosa para não bloquear o fluxo principal.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    await supabase.from("activity_logs").insert({
      user_id: userId,
      action: input.action,
      entity_type: input.entity_type ?? null,
      entity_id: input.entity_id ?? null,
      description: input.description ?? null,
    } as never);
  } catch (err) {
    console.warn("[activity-log] falha ao registrar:", err);
  }
}
