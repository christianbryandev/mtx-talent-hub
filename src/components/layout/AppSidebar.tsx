import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Building2,
  Target,
  Briefcase,
  ListChecks,
  CalendarDays,
  BarChart3,
  Shield,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import mtxLogo from "@/assets/mtx-hub-logo.png";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { ROLE_LABELS } from "@/types";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, tour: "nav-dashboard" },
  { title: "Jovens", url: "/jovens", icon: Users, tour: "nav-jovens" },
  { title: "Clientes", url: "/clientes", icon: Building2, tour: "nav-clientes" },
  { title: "CRM Comercial", url: "/crm", icon: Target, tour: "nav-crm" },
  { title: "Serviços", url: "/servicos", icon: Briefcase, tour: "nav-servicos" },
  { title: "Tarefas / Kanban", url: "/tarefas", icon: ListChecks, tour: "nav-tarefas" },
  { title: "Reuniões", url: "/reunioes", icon: CalendarDays, tour: "nav-reunioes" },
  { title: "Indicadores", url: "/indicadores", icon: BarChart3, tour: "nav-indicadores" },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const { isAdmin, isSuperAdmin, role } = usePermissions();

  const { data: pendingApps = 0 } = useQuery({
    queryKey: ["pending-applications-count"],
    enabled: isAdmin,
    queryFn: async () => {
      const { count } = await supabase
        .from("young_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");
      return count ?? 0;
    },
  });

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  const initials = (user?.email ?? "?")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          {collapsed ? (
            <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-mtx shadow-mtx-glow">
              <span className="text-sm font-black text-white">X</span>
            </div>
          ) : (
            <img
              src={mtxLogo}
              alt="MTX Hub"
              className="h-9 w-auto select-none drop-shadow-[0_0_12px_rgba(192,38,211,0.35)]"
              draggable={false}
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const showBadge = item.url === "/jovens" && isAdmin && pendingApps > 0;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {showBadge && !collapsed && (
                          <span className="ml-auto rounded-full bg-gradient-mtx px-1.5 py-0.5 text-[10px] font-bold text-white shadow-mtx-glow">
                            {pendingApps}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAdmin || isSuperAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/users")}
                    tooltip="Usuários e Permissões"
                  >
                    <Link to="/users" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Usuários</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isSuperAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/settings")}
                      tooltip="Configurações"
                    >
                      <Link to="/settings" className="flex items-center gap-2">
                        <SettingsIcon className="h-4 w-4" />
                        <span>Configurações</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 p-2">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="bg-gradient-mtx text-xs font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-xs font-medium">
                {user?.email ?? "Usuário"}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                {role ? ROLE_LABELS[role] : "Sem papel"}
              </span>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => signOut()}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
