import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to Supabase Realtime changes on a table and automatically
 * invalidate the specified React Query keys when any change happens.
 */
export function useRealtimeInvalidate(
  table: string,
  queryKeys: string[][],
) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`rt-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          queryKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);
}
