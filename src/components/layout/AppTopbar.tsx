import { useRouterState } from "@tanstack/react-router";
import { GlobalSearch } from "@/components/shared/GlobalSearch";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";

import { SidebarTrigger } from "@/components/ui/sidebar";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/jovens": "Jovens",
  "/clientes": "Clientes",
  "/crm": "CRM Comercial",
  "/servicos": "Serviços",
  "/tarefas": "Tarefas / Kanban",
  "/reunioes": "Reuniões",
  "/indicadores": "Indicadores",
  "/users": "Usuários e Permissões",
  "/settings": "Configurações",
  "/painel-notificacoes": "Painel de Notificações",
};

export function AppTopbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const title =
    Object.entries(TITLES).find(([k]) => pathname === k || pathname.startsWith(k + "/"))?.[1] ??
    "MTX Hub";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-background/60 px-4 backdrop-blur-xl lg:px-6">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <div className="hidden md:block">
        <h1 className="text-sm font-semibold tracking-tight text-foreground">{title}</h1>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <GlobalSearch />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
