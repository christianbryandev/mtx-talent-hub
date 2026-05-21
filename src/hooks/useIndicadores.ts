import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  computeAnalytics,
  fetchIndicadoresData,
  IndicadoresFilters,
} from "@/services/analyticsService";

export function useIndicadores(filters: IndicadoresFilters) {
  const q = useQuery({
    queryKey: ["indicadores", filters.range],
    queryFn: () => fetchIndicadoresData(filters),
    staleTime: 60_000,
  });

  const analytics = useMemo(
    () => (q.data ? computeAnalytics(q.data, filters) : null),
    [q.data, filters],
  );

  return { raw: q.data, analytics, isLoading: q.isLoading, error: q.error as Error | null };
}
