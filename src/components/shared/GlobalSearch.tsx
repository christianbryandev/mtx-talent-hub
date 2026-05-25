import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Search, 
  Users, 
  Building2, 
  Target, 
  Briefcase, 
  ListChecks, 
  Route as RouteIcon, 
  GraduationCap, 
  Bell, 
  CalendarDays, 
  UserCircle, 
  FileText, 
  ClipboardList,
  Clock,
  ArrowRight,
  Loader2,
  LayoutDashboard,
  Shield,
  Settings as SettingsIcon,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SearchCategory = 
  | "menu" 
  | "jornada" 
  | "clientes" 
  | "jovens" 
  | "admin" 
  | "crm" 
  | "perfil"
  | "configuracoes";

interface SearchResult {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle?: string;
  url: string;
}

const CATEGORY_LABELS: Record<SearchCategory, { label: string; icon: any }> = {
  menu: { label: "Menu Principal", icon: LayoutDashboard },
  jornada: { label: "Minha Jornada", icon: RouteIcon },
  clientes: { label: "Clientes", icon: Building2 },
  jovens: { label: "Jovens", icon: Users },
  crm: { label: "CRM Comercial", icon: Target },
  admin: { label: "Administração", icon: Shield },
  perfil: { label: "Meu Perfil", icon: UserCircle },
  configuracoes: { label: "Configurações", icon: SettingsIcon },
};

const NAVIGATION_ITEMS: SearchResult[] = [
  // Menu Principal
  { id: "nav-dashboard", category: "menu", title: "Dashboard", url: "/dashboard" },
  { id: "nav-tarefas", category: "menu", title: "Tarefas / Kanban", url: "/tarefas" },
  { id: "nav-reunioes", category: "menu", title: "Reuniões", url: "/reunioes" },
  { id: "nav-indicadores", category: "menu", title: "Indicadores - Geral", url: "/indicadores" },
  { id: "nav-indicadores-comercial", category: "menu", title: "Indicadores - Comercial", url: "/indicadores", subtitle: "Aba em Indicadores" },
  { id: "nav-indicadores-operacional", category: "menu", title: "Indicadores - Operacional", url: "/indicadores", subtitle: "Aba em Indicadores" },
  { id: "nav-indicadores-social", category: "menu", title: "Indicadores - Impacto Social", url: "/indicadores", subtitle: "Aba em Indicadores" },
  { id: "nav-indicadores-reunioes", category: "menu", title: "Indicadores - Reuniões", url: "/indicadores", subtitle: "Aba em Indicadores" },
  
  // Clientes
  { id: "nav-clientes-lista", category: "clientes", title: "Lista de Clientes", url: "/clientes" },
  { id: "nav-clientes-servicos", category: "clientes", title: "Serviços e Contratos", url: "/clientes", subtitle: "Aba em detalhes do cliente" },
  { id: "nav-clientes-briefing", category: "clientes", title: "Briefing de Cliente", url: "/clientes", subtitle: "Aba em detalhes do cliente" },
  
  // Jovens
  { id: "nav-jovens-lista", category: "jovens", title: "Lista de Jovens", url: "/jovens" },
  { id: "nav-jovens-inscricoes", category: "jovens", title: "Inscrições / Funil", url: "/jovens/inscricoes-funil" },
  
  // CRM
  { id: "nav-crm-pipeline", category: "crm", title: "CRM / Pipeline", url: "/crm" },
  { id: "nav-crm-lista", category: "crm", title: "Lista de Oportunidades", url: "/crm/lista" },
  
  // Minha Jornada
  { id: "nav-jornada-trilha", category: "jornada", title: "Minha Jornada - Trilha", url: "/jornada" },
  { id: "nav-jornada-ranking", category: "jornada", title: "Minha Jornada - Ranking", url: "/jornada", subtitle: "Aba de Ranking" },
  
  // Administração
  { id: "nav-admin-users", category: "admin", title: "Usuários e Permissões", url: "/users" },
  { id: "nav-admin-analytics", category: "admin", title: "Analytics da Jornada", url: "/admin/journey-analytics" },
  { id: "nav-admin-monitor", category: "admin", title: "Monitor da Jornada", url: "/admin/journey-monitor" },
  { id: "nav-admin-catalog", category: "admin", title: "Catálogo da Jornada (Fases)", url: "/admin/journey-catalog" },
  { id: "nav-admin-quizzes", category: "admin", title: "Gestão de Quizzes", url: "/admin/quizzes" },
  { id: "nav-admin-notifs", category: "admin", title: "Painel de Notificações", url: "/painel-notificacoes" },
  
  // Configurações & Perfil
  { id: "nav-perfil", category: "perfil", title: "Meu Perfil", url: "/meu-perfil" },
  { id: "nav-settings-geral", category: "configuracoes", title: "Configurações Gerais", url: "/settings" },
  { id: "nav-settings-categorias", category: "configuracoes", title: "Categorias de Serviços", url: "/settings", subtitle: "Aba de Configurações" },
  { id: "nav-settings-notificacoes", category: "configuracoes", title: "Preferências de Notificação", url: "/settings", subtitle: "Aba de Configurações" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SearchCategory | "all">("all");
  const [history, setHistory] = useState<SearchResult[]>([]);
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("global-search-history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading search history", e);
      }
    }
  }, []);

  const saveToHistory = (item: SearchResult) => {
    const newHistory = [item, ...history.filter(h => h.id !== item.id)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem("global-search-history", JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("global-search-history");
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const performSearch = useCallback((searchTerm: string) => {
    if (searchTerm.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    
    // Simulate slight delay for "search feel" although it's static now
    setTimeout(() => {
      const normalizedQuery = searchTerm.toLowerCase();
      
      const matchedItems = NAVIGATION_ITEMS.filter(item => {
        const inTitle = item.title.toLowerCase().includes(normalizedQuery);
        const inSubtitle = item.subtitle?.toLowerCase().includes(normalizedQuery);
        const inCategory = CATEGORY_LABELS[item.category].label.toLowerCase().includes(normalizedQuery);
        
        return inTitle || inSubtitle || inCategory;
      });

      setResults(matchedItems);
      setLoading(false);
    }, 100);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const onSelect = (item: SearchResult) => {
    saveToHistory(item);
    setOpen(false);
    setQuery("");
    navigate({ to: item.url as any });
  };

  const filteredResults = useMemo(() => {
    if (activeCategory === "all") return results;
    return results.filter(r => r.category === activeCategory);
  }, [results, activeCategory]);

  const categoriesInResults = useMemo(() => {
    const cats = new Set<SearchCategory>();
    results.forEach(r => cats.add(r.category));
    return Array.from(cats);
  }, [results]);

  if (!isAdmin) return null;

  return (
    <>
      <div 
        onClick={() => setOpen(true)}
        className="relative hidden md:block cursor-pointer"
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <div className="flex h-9 w-64 items-center justify-between rounded-full border border-white/10 bg-white/[0.03] pl-8 pr-2 transition-colors hover:bg-white/[0.06]">
          <span className="text-sm text-muted-foreground">Buscar em tudo...</span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-white/20 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <CommandInput 
            placeholder="Digite para buscar..." 
            value={query}
            onValueChange={setQuery}
            className="flex-1"
          />
          {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin opacity-50" />}
        </div>
        
        <div className="flex gap-1 overflow-x-auto p-2 scrollbar-none border-b border-white/5">
          <Button
            variant={activeCategory === "all" ? "default" : "ghost"}
            size="sm"
            className="h-7 rounded-full text-xs"
            onClick={() => setActiveCategory("all")}
          >
            Todos
          </Button>
          {(Object.keys(CATEGORY_LABELS) as SearchCategory[]).map((cat) => {
            const { label } = CATEGORY_LABELS[cat];
            return (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "ghost"}
                size="sm"
                className="h-7 rounded-full text-xs whitespace-nowrap"
                onClick={() => setActiveCategory(cat)}
              >
                {label}
              </Button>
            );
          })}
        </div>

        <CommandList className="max-h-[450px]">
          <CommandEmpty className="py-12 text-center">
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Buscando...</p>
              </div>
            ) : query.length >= 2 ? (
              <div className="flex flex-col items-center gap-2">
                <Search className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum resultado encontrado para "{query}"</p>
              </div>
            ) : query.length > 0 ? (
              <p className="text-sm text-muted-foreground">Digite pelo menos 2 caracteres</p>
            ) : history.length > 0 ? (
              <div className="text-left w-full px-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Clock className="h-3.5 w-3.5" />
                    Buscas recentes
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[10px] text-muted-foreground hover:text-destructive"
                    onClick={clearHistory}
                  >
                    Limpar histórico
                  </Button>
                </div>
                <div className="space-y-1">
                  {history.map((item) => (
                    <CommandItem
                      key={`hist-${item.id}-${item.category}`}
                      onSelect={() => onSelect(item)}
                      className="flex items-center gap-3 rounded-md px-2 py-2 cursor-pointer hover:bg-white/5"
                    >
                      {(() => {
                        const Icon = CATEGORY_LABELS[item.category]?.icon || Search;
                        return <Icon className="h-4 w-4 text-muted-foreground" />;
                      })()}
                      <div className="flex flex-1 flex-col">
                        <span className="text-sm font-medium">{item.title}</span>
                        <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[item.category]?.label}</span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </CommandItem>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8">
                <Search className="h-8 w-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Busque por abas e seções do sistema...</p>
                <div className="mt-4 flex gap-2">
                  <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-xs">⌘</kbd>
                  <span className="text-xs text-muted-foreground">+</span>
                  <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-xs">K</kbd>
                </div>
              </div>
            )}
          </CommandEmpty>

          {categoriesInResults.map((cat) => {
            const catResults = filteredResults.filter(r => r.category === cat);
            if (catResults.length === 0) return null;
            
            const { label, icon: Icon } = CATEGORY_LABELS[cat];
            
            return (
              <CommandGroup 
                key={cat} 
                heading={
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </div>
                }
              >
                {catResults.map((item) => (
                  <CommandItem
                    key={`${item.category}-${item.id}`}
                    onSelect={() => onSelect(item)}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
                  >
                    <Icon className="h-4 w-4 text-primary/70 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate text-foreground">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CommandItem>
                ))}
                <CommandSeparator className="mt-2" />
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}

function itemToCategoryUrl(cat: SearchCategory): string {
  switch (cat) {
    case "jovens": return "/jovens";
    case "clientes": return "/clientes";
    case "crm": return "/crm";
    case "jornada": return "/jornada";
    case "admin": return "/admin/journey-catalog";
    case "configuracoes": return "/settings";
    case "perfil": return "/meu-perfil";
    default: return "/dashboard";
  }
}
