import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Check, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import {
  NOTIFICATION_META,
  getNotificationRoute,
  type NotificationRow,
  type NotificationType,
} from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  component: NotificationsPage,
});

const PAGE_SIZE = 20;

function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { markAsRead, markAllAsRead, clearRead, unreadCount } = useNotifications(0);

  const [filter, setFilter] = useState<"todas" | "nao_lidas" | "lidas">("todas");
  const [type, setType] = useState<NotificationType | "todas">("todas");
  const [page, setPage] = useState(0);

  const queryKey = useMemo(
    () => ["notifications-page", user?.id, filter, type, page],
    [user?.id, filter, type, page],
  );

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (filter === "nao_lidas") q = q.eq("read", false);
      if (filter === "lidas") q = q.eq("read", true);
      if (type !== "todas") q = q.eq("type", type);

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as NotificationRow[], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleClick = async (n: NotificationRow) => {
    if (!n.read) await markAsRead(n.id);
    const route = getNotificationRoute(n);
    if (route) navigate({ to: route });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notificações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `Você tem ${unreadCount} notificação${unreadCount === 1 ? "" : "s"} não lida${unreadCount === 1 ? "" : "s"}`
              : "Tudo em dia"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => markAllAsRead()} disabled={unreadCount === 0}>
            <Check className="mr-1.5 h-4 w-4" /> Marcar todas como lidas
          </Button>
          <Button variant="outline" size="sm" onClick={() => clearRead()}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Limpar lidas
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => { setFilter(v as typeof filter); setPage(0); }}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="nao_lidas">Não lidas</TabsTrigger>
            <TabsTrigger value="lidas">Lidas</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={type} onValueChange={(v) => { setType(v as NotificationType | "todas"); setPage(0); }}>
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os tipos</SelectItem>
            {(Object.keys(NOTIFICATION_META) as NotificationType[]).map((t) => (
              <SelectItem key={t} value={t}>{NOTIFICATION_META[t].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02]">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação encontrada</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {rows.map((n) => {
              const meta = NOTIFICATION_META[n.type] ?? NOTIFICATION_META.geral;
              const Icon = meta.icon;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-white/5",
                      !n.read && "bg-white/[0.025]",
                    )}
                  >
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", meta.bg)}>
                      <Icon className={cn("h-5 w-5", meta.color)} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className={cn("text-sm text-foreground", !n.read ? "font-semibold" : "font-medium")}>
                          {n.title}
                        </p>
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-mtx" />}
                      </div>
                      {n.message && <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>}
                      <p className="mt-1.5 text-xs text-muted-foreground/70">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page + 1} de {totalPages} · {total} no total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
