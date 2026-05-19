import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RealtimeFilter {
  column: string;
  value: string;
}

export function useRealtimeTable<T extends { id: string }>(
  tableName: string,
  queryFn: () => Promise<T[]>,
  filter?: RealtimeFilter,
  queryKey?: string[],
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await queryFnRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro ao carregar dados"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channelName = filter
      ? `realtime-${tableName}-${filter.column}-${filter.value}`
      : `realtime-${tableName}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: tableName,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setData((prev) => [payload.new as T, ...prev]);
          }
          if (payload.eventType === "UPDATE") {
            setData((prev) =>
              prev.map((item) =>
                item.id === (payload.new as T).id ? (payload.new as T) : item,
              ),
            );
          }
          if (payload.eventType === "DELETE") {
            setData((prev) => prev.filter((item) => item.id !== (payload.old as T).id));
          }
          queryClient.invalidateQueries({ queryKey: queryKey ?? [tableName] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, filter?.column, filter?.value]);

  return { data, loading, error, refetch: fetchData };
}
