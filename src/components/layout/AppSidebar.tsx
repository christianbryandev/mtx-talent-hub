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
  Settings as SettingsIcon,
  Route as RouteIcon,
  LogOut,
  UserCircle,
  Zap,
  BarChart2,
  GraduationCap,
  Bell,
  Mail,
  ClipboardList,
  ChevronRight,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { ROLE_LABELS } from "@/types";

import type { AppRole } from "@/types";

type MenuItem = {
  title: string;
  url: string;
  icon: any;
  roles: AppRole[];
};

type MenuGroup = {
  title: string;
  icon: any;
  items: MenuItem[];
};

type SidebarElement = MenuItem | MenuGroup;

const operationElements: SidebarElement[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin", "comercial", "jovem_aprendiz", "cliente"] },
  {
    title: "Relacionamento",
    icon: Users,
    items: [
      { title: "Jovens", url: "/jovens", icon: Users, roles: ["super_admin", "admin"] },
      { title: "Clientes", url: "/clientes", icon: Building2, roles: ["super_admin", "admin", "comercial"] },
      { title: "CRM Comercial", url: "/crm", icon: Target, roles: ["super_admin", "admin", "comercial"] },
    ]
  },
  {
    title: "Fluxo de Trabalho",
    icon: Briefcase,
    items: [
      { title: "Serviços", url: "/servicos", icon: Briefcase, roles: ["super_admin", "admin", "cliente"] },
      { title: "Tarefas / Kanban", url: "/tarefas", icon: ListChecks, roles: ["super_admin", "admin", "comercial", "jovem_aprendiz", "cliente"] },
      { title: "Reuniões", url: "/reunioes", icon: CalendarDays, roles: ["super_admin", "admin", "comercial", "jovem_aprendiz", "cliente"] },
    ]
  },
  { title: "Minha Jornada", url: "/jornada", icon: RouteIcon, roles: ["super_admin", "admin", "comercial", "jovem_aprendiz"] },
  { title: "Indicadores", url: "/indicadores", icon: BarChart3, roles: ["super_admin", "admin", "comercial"] },
];

const adminGroups: MenuGroup[] = [
  {
    title: "Inteligência",
    icon: BarChart2,
    items: [
      { title: "Analytics Jornada", url: "/admin/journey-analytics", icon: BarChart2, roles: ["super_admin"] },
    ]
  },
  {
    title: "Conteúdo",
    icon: GraduationCap,
    items: [
      { title: "Catálogo Jornada", url: "/admin/journey-catalog", icon: GraduationCap, roles: ["super_admin"] },
      { title: "Quizzes", url: "/admin/quizzes", icon: ClipboardList, roles: ["super_admin"] },
    ]
  },
  {
    title: "Sistema",
    icon: SettingsIcon,
    items: [
      { title: "Usuários", url: "/users", icon: Users, roles: ["super_admin"] },
      { title: "Painel de Notificações", url: "/painel-notificacoes", icon: Bell, roles: ["super_admin"] },
      { title: "Configurações Gerais", url: "/settings", icon: SettingsIcon, roles: ["super_admin"] },
      { title: "Configurações E-mail", url: "/configuracoes", icon: Mail, roles: ["super_admin"] },
    ]
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, avatarUrl, signOut } = useAuth();
  const { isAdmin, isSuperAdmin, isComercial, isJovemAprendiz, role, roles } = usePermissions();
  // XP only relevant for jovem_aprendiz (journey owner). Hook is safe-noop for others.
  const { data: journey } = useJourney(isJovemAprendiz ? undefined : "00000000-0000-0000-0000-000000000000");

  const { data: pendingAppsCount = 0 } = useQuery({
    queryKey: ["pending-applications-count-combined"],
    enabled: isAdmin,
    queryFn: async () => {
      const [oldApps, newApps] = await Promise.all([
        supabase.from("young_applications").select("*", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending")
      ]);
      return (oldApps.count ?? 0) + (newApps.count ?? 0);
    },
  });

  const { data: hasYoungProfile = true } = useQuery({
    queryKey: ["has-young-profile", user?.id],
    enabled: !!user && isJovemAprendiz,
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

  const renderElement = (el: SidebarElement) => {
    if ("url" in el) {
      // É um item solto (MenuItem)
      const item = el as MenuItem;
      const canView = (isSuperAdmin && item.roles.includes("super_admin")) ||
                      (isAdmin && item.roles.includes("admin")) ||
                      (isComercial && item.roles.includes("comercial")) ||
                      (isJovemAprendiz && item.roles.includes("jovem_aprendiz")) ||
                      item.roles.some((r) => roles.includes(r));
                      
      if (!canView) return null;

      const showBadge = item.url === "/jovens" && isAdmin && pendingAppsCount > 0;
      return (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton
            asChild
            isActive={isActive(item.url)}
            tooltip={item.title}
            className={item.url === "/dashboard" ? "dashboard-active-gradient-border" : undefined}
          >
            <Link to={item.url} className="flex items-center gap-2 relative">
              <item.icon className="h-4 w-4 relative z-10" />
              <span className="relative z-10">{item.title}</span>
              {showBadge && !collapsed && (
                <span className="ml-auto rounded-full bg-gradient-mtx px-1.5 py-0.5 text-xs font-bold text-white shadow-mtx-glow relative z-10">
                  {pendingAppsCount}
                </span>
              )}
              {item.url === "/dashboard" && (
                <div className="spinning-border-container" />
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    } else {
      // É um grupo (MenuGroup)
      const group = el as MenuGroup;
      const visibleItems = group.items.filter(item => 
        (isSuperAdmin && item.roles.includes("super_admin")) ||
        (isAdmin && item.roles.includes("admin")) ||
        (isComercial && item.roles.includes("comercial")) ||
        (isJovemAprendiz && item.roles.includes("jovem_aprendiz")) ||
        item.roles.some((r) => roles.includes(r))
      );

      if (visibleItems.length === 0) return null;

      const isGroupActive = visibleItems.some(item => isActive(item.url));

      return (
        <Collapsible key={group.title} defaultOpen={isGroupActive} className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip={group.title}>
                <group.icon className="h-4 w-4" />
                <span>{group.title}</span>
                <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {visibleItems.map(item => {
                  const showBadge = item.url === "/jovens" && isAdmin && pendingAppsCount > 0;
                  return (
                    <SidebarMenuSubItem key={item.url}>
                      <SidebarMenuSubButton asChild isActive={isActive(item.url)}>
                        <Link to={item.url} className="flex items-center gap-2">
                          <span>{item.title}</span>
                          {showBadge && !collapsed && (
                            <span className="ml-auto rounded-full bg-gradient-mtx px-1.5 py-0.5 text-xs font-bold text-white shadow-mtx-glow">
                              {pendingAppsCount}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }
  };

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
              {operationElements.map(renderElement)}
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
              {role === "jovem_aprendiz" && !hasYoungProfile && !collapsed && (
                <div className="mx-2 mt-2 rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <UserCircle className="h-4 w-4" />
                    Seu perfil está incompleto
                  </div>
                  <Button
                    asChild
                    size="sm"
                    className="mt-2 h-7 w-full bg-gradient-mtx text-xs font-semibold text-white"
                  >
                    <Link to="/meu-perfil">Criar meu perfil</Link>
                  </Button>
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminGroups.map(renderElement)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {isJovemAprendiz && !collapsed && (
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
                <span className="truncate text-xs text-muted-foreground">
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
