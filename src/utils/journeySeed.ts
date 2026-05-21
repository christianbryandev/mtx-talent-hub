import { supabase } from "@/integrations/supabase/client";

export interface SeedResult {
  seeded: boolean;
  reason?: string;
  phases?: number;
}

/**
 * Popula o catálogo da Jornada (fases, cards, checklist, quizzes) com 3 fases
 * de exemplo. Idempotente: a RPC retorna { seeded: false } se já houver fases.
 * Acesso restrito a admin/super_admin (validado no backend).
 */
export async function seedJourneyDemo(): Promise<SeedResult> {
  const { data, error } = await supabase.rpc(
    "seed_journey_demo" as never,
  );
  if (error) throw new Error(error.message);
  return (data ?? { seeded: false }) as SeedResult;
}

/**
 * Inicia a jornada do usuário autenticado, marcando a primeira fase
 * como "em_andamento".
 */
export async function startUserJourney(): Promise<{ started: boolean; phase_id?: string }> {
  const { data, error } = await supabase.rpc(
    "start_user_journey" as never,
  );
  if (error) throw new Error(error.message);
  return (data ?? { started: false }) as { started: boolean; phase_id?: string };
}
