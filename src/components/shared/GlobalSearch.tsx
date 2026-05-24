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
  Loader2
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
  | "jovens" 
  | "clientes" 
  | "oportunidades" 
  | "servicos" 
  | "tarefas" 
  | "jornadas" 
  | "quizzes" 
  | "notificacoes" 
  | "reunioes" 
  | "perfis" 
  | "propostas" 
  | "briefings";

interface SearchResult {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle?: string;
  url: string;
}

const CATEGORY_LABELS: Record<SearchCategory, { label: string; icon: any }> = {
  jovens: { label: "Jovens", icon: Users },
  clientes: { label: "Clientes", icon: Building2 },
  oportunidades: { label: "Oportunidades", icon: Target },
  servicos: { label: "Serviços", icon: Briefcase },
  tarefas: { label: "Tarefas", icon: ListChecks },
  jornadas: { label: "Jornadas", icon: RouteIcon },
  quizzes: { label: "Quizzes", icon: GraduationCap },
  notificacoes: { label: "Notificações", icon: Bell },
  reunioes: { label: "Reuniões", icon: CalendarDays },
  perfis: { label: "Perfis", icon: UserCircle },
  propostas: { label: "Propostas", icon: FileText },
  briefings: { label: "Briefings", icon: ClipboardList },
};

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

  const performSearch = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const q = `%${searchTerm}%`;

    try {
      // Parallel searches
      const searchPromises = [
        // Jovens + Profiles
        supabase
          .from("young_people")
          .select("id, full_name, email, trail_phase")
          .or(`full_name.ilike.${q},email.ilike.${q}`)
          .limit(6)
          .then(res => (res.data ?? []).map(r => ({
            id: r.id,
            category: "jovens" as const,
            title: (r.full_name as string) || 'Sem nome',
            subtitle: `${(r.email as string) || ''} • ${r.trail_phase ?? 'Sem fase'}`,
            url: `/jovens/${r.id}`
          }))),

        // Clientes
        supabase
          .from("clients")
          .select("id, company_name, trade_name, email")
          .or(`company_name.ilike.${q},trade_name.ilike.${q},email.ilike.${q}`)
          .limit(6)
          .then(res => (res.data ?? []).map(r => ({
            id: r.id,
            category: "clientes" as const,
            title: (r.trade_name as string) || (r.company_name as string) || 'Sem nome',
            subtitle: (r.company_name as string) || '',
            url: `/clientes/${r.id}`
          }))),

        // Oportunidades
        supabase
          .from("opportunities")
          .select("id, company_name, contact_name, status")
          .or(`company_name.ilike.${q},contact_name.ilike.${q}`)
          .limit(6)
          .then(res => (res.data ?? []).map(r => ({
            id: r.id,
            category: "oportunidades" as const,
            title: (r.company_name as string) || 'Oportunidade',
            subtitle: `${(r.contact_name as string) ?? ''} • ${(r.status as string)}`,
            url: `/crm/${r.id}`
          }))),

        // Serviços
        supabase
          .from("services")
          .select("id, name, category")
          .or(`name.ilike.${q},description.ilike.${q}`)
          .limit(6)
          .then(res => (res.data ?? []).map(r => ({
            id: r.id,
            category: "servicos" as const,
            title: (r.name as string) || 'Serviço',
            subtitle: (r.category as string) ?? '',
            url: `/servicos/${r.id}`
          }))),

        // Tarefas
        supabase
          .from("tasks")
          .select("id, title, status, young_people:young_responsible(full_name)")
          .or(`title.ilike.${q},description.ilike.${q}`)
          .limit(6)
          .then(res => (res.data ?? []).map(r => ({
            id: r.id,
            category: "tarefas" as const,
            title: (r.title as string) || 'Tarefa',
            subtitle: `${(r.status as string)} • ${(r.young_people as any)?.full_name ?? 'Sem responsável'}`,
            url: `/tarefas` // Kanban doesn't have ID-specific URL yet, opens drawer via state usually
          }))),

        // Jornadas (Fases)
        supabase
          .from("journey_phase_catalog")
          .select("id, title")
          .ilike("title", q)
          .limit(6)
          .then(res => (res.data ?? []).map(r => ({
            id: r.id,
            category: "jornadas" as const,
            title: (r.title as string) || 'Fase',
            subtitle: "Fase da Jornada",
            url: `/admin/journey-catalog`
          }))),

        // Quizzes
        supabase
          .from("quiz_templates")
          .select("id, title")
          .ilike("title", q)
          .limit(6)
          .then(res => (res.data ?? []).map(r => ({
            id: r.id,
            category: "quizzes" as const,
            title: (r.title as string) || 'Quiz',
            subtitle: "Modelo de Quiz",
            url: `/admin/quizzes`
          }))),

        // Notificações
        supabase
          .from("notifications")
          .select("id, title, message, created_at")
          .or(`title.ilike.${q},message.ilike.${q}`)
          .limit(6)
          .then(res => (res.data ?? []).map(r => ({
            id: r.id,
            category: "notificacoes" as const,
            title: (r.title as string) || 'Notificação',
            subtitle: new Date(r.created_at).toLocaleDateString("pt-BR"),
            url: `/notificacoes`
          }))),

        // Reuniões
        supabase
          .from("meetings")
          .select("id, title, date")
          .or(`title.ilike.${q},observations.ilike.${q}`)
          .limit(6)
          .then(res => (res.data ?? []).map(r => ({
            id: r.id,
            category: "reunioes" as const,
            title: (r.title as string) || 'Reunião',
            subtitle: new Date(r.date as string).toLocaleDateString("pt-BR"),
            url: `/reunioes/${r.id}`
          }))),

        // Perfis
        supabase
          .from("profiles")
          .select("id, full_name, email")
          .or(`full_name.ilike.${q},email.ilike.${q}`)
          .limit(6)
          .then(res => (res.data ?? []).map(r => ({
            id: r.id,
            category: "perfis" as const,
            title: (r.full_name as string) ?? (r.email as string) ?? 'Sem nome',
            subtitle: (r.email as string) ?? '',
            url: `/users` // Perfil page or users management
          }))),

        // Propostas
        supabase
          .from("proposals")
          .select("id, title, status")
          .or(`title.ilike.${q},description.ilike.${q}`)
          .limit(6)
          .then(res => (res.data ?? []).map(r => ({
            id: r.id,
            category: "propostas" as const,
            title: r.title || 'Proposta',
            subtitle: (r.status as string) || '',
            url: `/crm` // No specific route yet
          }))),

        // Briefings
        supabase
          .from("client_briefings")
          .select("id, company_name, contact_name, submitted_at")
          .or(`company_name.ilike.${q},contact_name.ilike.${q},additional_notes.ilike.${q}`)
          .limit(6)
          .then(res => (res.data ?? []).map(r => ({
            id: r.id,
            category: "briefings" as const,
            title: (r.company_name as string) || 'Briefing',
            subtitle: `Enviado em ${new Date(r.submitted_at as string).toLocaleDateString("pt-BR")}`,
            url: `/clientes`
          }))),
      ];

      const allResults = await Promise.all(searchPromises);
      const flattened = allResults.flat();
      setResults(flattened.slice(0, 50));
    } catch (err) {
      console.error("Global search failed", err);
    } finally {
      setLoading(false);
    }
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
                <p className="text-sm text-muted-foreground">Busque por jovens, clientes, tarefas e mais...</p>
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
                {catResults.length >= 5 && (
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      navigate({ to: itemToCategoryUrl(cat) as any });
                    }}
                    className="text-xs text-primary font-medium pl-10 cursor-pointer justify-center"
                  >
                    Ver todos os resultados de {label}
                  </CommandItem>
                )}
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
    case "oportunidades": return "/crm";
    case "servicos": return "/servicos";
    case "tarefas": return "/tarefas";
    case "jornadas": return "/admin/journey-catalog";
    case "quizzes": return "/admin/quizzes";
    case "notificacoes": return "/notificacoes";
    case "reunioes": return "/reunioes";
    case "perfis": return "/users";
    case "propostas": return "/crm";
    case "briefings": return "/clientes";
    default: return "/dashboard";
  }
}
