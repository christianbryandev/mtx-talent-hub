import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface JourneyKpis {
  total_users: number;
  active_users: number;
  completed_users: number;
  avg_xp: number;
}

export interface JourneyPhaseDistribution {
  phase_id: string;
  phase_name: string;
  order_index: number;
  nao_iniciada: number;
  em_andamento: number;
  concluida: number;
  bloqueada: number;
  total_users: number;
}

export interface JourneyConversion {
  total_started: number;
  total_completed: number;
  dropoff_rate: number;
  quiz_pass_rate: number;
  quiz_attempts_total: number;
  quiz_attempts_passed: number;
}

type RpcName =
  | "get_journey_kpis"
  | "get_journey_phase_distribution"
  | "get_journey_conversion";

async function callRpc<T>(name: RpcName): Promise<T> {
  const { data, error } = await supabase.rpc(name);
  if (error) throw new Error(error.message);
  return data as unknown as T;
}

export function useJourneyKPIs() {
  const q = useQuery({
    queryKey: ["journey-analytics", "kpis"],
    queryFn: () => callRpc<JourneyKpis>("get_journey_kpis"),
    staleTime: 60_000,
  });
  return { data: q.data, loading: q.isLoading, error: q.error as Error | null };
}

export function usePhaseFunnel() {
  const q = useQuery({
    queryKey: ["journey-analytics", "distribution"],
    queryFn: () => callRpc<JourneyPhaseDistribution[]>("get_journey_phase_distribution"),
    staleTime: 60_000,
  });
  return { data: q.data, loading: q.isLoading, error: q.error as Error | null };
}

export function useJourneyConversion() {
  const q = useQuery({
    queryKey: ["journey-analytics", "conversion"],
    queryFn: () => callRpc<JourneyConversion>("get_journey_conversion"),
    staleTime: 60_000,
  });
  return { data: q.data, loading: q.isLoading, error: q.error as Error | null };
}
