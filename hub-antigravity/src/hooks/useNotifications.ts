import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { NotificationRow } from "@/lib/notifications";
import { createNotification, type CreateNotificationInput } from "@/lib/notifications";

const QK = (userId: string | undefined) => ["notifications", userId] as const;

export function useNotifications(limit = 20) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QK(userId),
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!userId) return [] as NotificationRow[];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  const notifications = data ?? [];
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as NotificationRow;
          queryClient.setQueryData<NotificationRow[]>(QK(userId), (prev) => {
            const next = [row, ...(prev ?? [])];
            return next.slice(0, limit);
          });
          toast(row.title, { description: row.message ?? undefined });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as NotificationRow;
          queryClient.setQueryData<NotificationRow[]>(QK(userId), (prev) =>
            (prev ?? []).map((n) => (n.id === row.id ? row : n)),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const oldRow = payload.old as { id: string };
          queryClient.setQueryData<NotificationRow[]>(QK(userId), (prev) =>
            (prev ?? []).filter((n) => n.id !== oldRow.id),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, limit]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      queryClient.setQueryData<NotificationRow[]>(QK(userId), (prev) =>
        (prev ?? []).map((n) => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n)),
      );
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) console.error(error);
    },
    [userId, queryClient],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    queryClient.setQueryData<NotificationRow[]>(QK(userId), (prev) =>
      (prev ?? []).map((n) => ({ ...n, read: true, read_at: n.read_at ?? new Date().toISOString() })),
    );
    const { error } = await supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) console.error(error);
  }, [userId, queryClient]);

  const clearRead = useCallback(async () => {
    if (!userId) return;
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("read", true);
    if (error) console.error(error);
    queryClient.invalidateQueries({ queryKey: QK(userId) });
  }, [userId, queryClient]);

  const notify = useCallback(async (input: CreateNotificationInput | CreateNotificationInput[]) => {
    await createNotification(input);
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearRead,
    createNotification: notify,
  };
}
