import { useEffect, useState } from "react";
import { resolveNotificationAttachmentUrl } from "@/lib/notification-attachment";

import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Check, Paperclip } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import {
  NOTIFICATION_META,
  getNotificationRoute,
  type NotificationRow,
  type NotificationType,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationRow | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(20);

  useEffect(() => {
    let cancelled = false;
    setAttachmentUrl(null);
    if (selectedNotification?.attachment_url) {
      resolveNotificationAttachmentUrl(selectedNotification.attachment_url).then((url) => {
        if (!cancelled) setAttachmentUrl(url);
      });
    }
    return () => { cancelled = true; };
  }, [selectedNotification?.id, selectedNotification?.attachment_url]);


  const handleClick = async (n: NotificationRow) => {
    if (!n.read) await markAsRead(n.id);
    
    // Se for uma notificação de sistema com rota específica, navega
    const route = getNotificationRoute(n);
    if (route) {
      setOpen(false);
      navigate({ to: route });
    } else {
      // Se não tiver rota (notificação enviada pelo admin), abre o modal de detalhes
      setSelectedNotification(n);
      setOpen(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5"
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-mtx px-1 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(236,72,153,0.8)]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[380px] border-white/10 bg-background/95 p-0 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Check className="h-3 w-3" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <ScrollArea className="max-h-[420px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhuma notificação por enquanto</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {notifications.map((n) => {
                  const meta = NOTIFICATION_META[n.type] ?? NOTIFICATION_META.geral;
                  const Icon = meta.icon;
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleClick(n)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5",
                          !n.read && "bg-white/[0.025]",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            meta.bg,
                          )}
                        >
                          <Icon className={cn("h-4 w-4", meta.color)} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                "truncate text-sm text-foreground",
                                !n.read ? "font-semibold" : "font-medium",
                              )}
                            >
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-mtx" />
                            )}
                          </div>
                          {n.message && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {n.message}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-muted-foreground/70">
                            {formatDistanceToNow(new Date(n.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>

          <div className="border-t border-white/5 px-4 py-2.5">
            <Link
              to="/notificacoes"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver todas
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-md bg-zinc-900 border-white/5 text-foreground">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              {selectedNotification && (
                <div className={cn("p-2 rounded-lg", NOTIFICATION_META[selectedNotification.type]?.bg)}>
                  {(() => {
                    const Icon = NOTIFICATION_META[selectedNotification.type]?.icon || Bell;
                    return <Icon className={cn("h-5 w-5", NOTIFICATION_META[selectedNotification.type]?.color)} />;
                  })()}
                </div>
              )}
              <DialogTitle className="text-foreground">{selectedNotification?.title}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Enviado em {selectedNotification && format(new Date(selectedNotification.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {selectedNotification?.message}
            </div>

            {selectedNotification?.attachment_url && (
              <div className="mt-4 rounded-xl border border-white/5 overflow-hidden bg-white/5">
                {selectedNotification.attachment_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <img 
                    src={selectedNotification.attachment_url} 
                    alt="Anexo" 
                    className="w-full h-auto max-h-[300px] object-contain"
                  />
                ) : (
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-foreground">Anexo da Notificação</span>
                    </div>
                    <Button variant="outline" size="sm" asChild className="h-8 text-xs text-foreground border-white/10 hover:bg-white/5">
                      <a href={selectedNotification.attachment_url} target="_blank" rel="noopener noreferrer">
                        Visualizar / Baixar
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
