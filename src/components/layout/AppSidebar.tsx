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
  Route as RouteIcon,
  LogOut,
  UserCircle,
  Zap,
} from "lucide-react";
import { useJourney } from "@/hooks/useJourney";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { ROLE_LABELS } from "@/types";

import type { AppRole } from "@/types";

type MainItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles: AppRole[]; // papéis que podem ver
};

const mainItems: MainItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "comercial", "colaborador", "cliente"] },
  { title: "Jovens", url: "/jovens", icon: Users, roles: ["super_admin", "admin"] },
  { title: "Clientes", url: "/clientes", icon: Building2, roles: ["super_admin", "admin", "comercial"] },
  { title: "CRM Comercial", url: "/crm", icon: Target, roles: ["super_admin", "admin", "comercial"] },
  { title: "Serviços", url: "/servicos", icon: Briefcase, roles: ["super_admin", "admin"] },
  { title: "Tarefas / Kanban", url: "/tarefas", icon: ListChecks, roles: ["super_admin", "admin", "comercial", "colaborador"] },
  { title: "Minha Jornada", url: "/jornada", icon: RouteIcon, roles: ["super_admin", "admin", "comercial", "colaborador"] },
  { title: "Reuniões", url: "/reunioes", icon: CalendarDays, roles: ["super_admin", "admin", "comercial", "colaborador", "cliente"] },
  { title: "Indicadores", url: "/indicadores", icon: BarChart3, roles: ["super_admin", "admin", "comercial"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, avatarUrl, signOut } = useAuth();
  const { isAdmin, isSuperAdmin, role } = usePermissions();
  const isColaborador = role === "colaborador";
  // XP only relevant for colaborador (journey owner). Hook is safe-noop for others.
  const { data: journey } = useJourney(isColaborador ? undefined : "00000000-0000-0000-0000-000000000000");

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

  const { data: hasYoungProfile = true } = useQuery({
    queryKey: ["has-young-profile", user?.id],
    enabled: !!user && role === "colaborador",
    queryFn: async () => {
      const { data } = await supabase
        .from("young_people")
        .select("id")
        .eq("profile_id", user!.id)
        .maybeSingle();
      return !!data;
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
              {mainItems
                .filter((item) => !role || item.roles.includes(role))
                .map((item) => {
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

        {!isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Pessoal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/meu-perfil")} tooltip="Meu Perfil">
                    <Link to="/meu-perfil" className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4" />
                      <span>Meu Perfil</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              {role === "colaborador" && !hasYoungProfile && !collapsed && (
                <div className="mx-2 mt-2 rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <UserCircle className="h-4 w-4" />
                    Seu perfil está incompleto
                  </div>
                  <Button
                    asChild
                    size="sm"
                    className="mt-2 h-7 w-full bg-gradient-mtx text-[11px] font-semibold text-white"
                  >
                    <Link to="/meu-perfil">Criar meu perfil</Link>
                  </Button>
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

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
        {isColaborador && !collapsed && (
          <Link
            to="/jornada"
            className="mx-2 mt-2 inline-flex w-fit items-center gap-1 rounded-md border border-border/60 px-1.5 py-0.5 text-[11px] font-medium text-amber-400 transition-colors hover:border-amber-400/40"
            title="Ver minha jornada"
          >
            <Zap size={12} /> {journey?.total_xp ?? 0} XP
          </Link>
        )}
        <div className="flex items-center gap-2 p-2">
          <Link
            to="/perfil"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 transition-colors hover:bg-sidebar-accent"
            title="Meu perfil"
          >
            <Avatar className="h-8 w-8 border border-border">
              <AvatarImage src={avatarUrl ?? undefined} />
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
          </Link>
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
