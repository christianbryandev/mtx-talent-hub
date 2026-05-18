import { useRouterState } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

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
};

export function AppTopbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();

  const title =
    Object.entries(TITLES).find(([k]) => pathname === k || pathname.startsWith(k + "/"))?.[1] ??
    "MTX Hub";

  const initials = (user?.email ?? "?").split("@")[0].slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <div className="hidden md:block">
        <h1 className="text-sm font-semibold tracking-tight text-foreground">{title}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="h-9 w-64 pl-8 bg-card/60"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
        </Button>
        <Avatar className="h-8 w-8 border border-border">
          <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
