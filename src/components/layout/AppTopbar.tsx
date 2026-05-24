import { useRouterState } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";

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

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="h-9 w-64 rounded-full border-white/10 bg-white/[0.03] pl-8 focus-visible:ring-primary/40"
          />
        </div>
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
