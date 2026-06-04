import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface YoungOption {
  id: string;
  full_name: string;
  status: string | null;
  trail_phase: string | null;
  avatar_url: string | null;
  email: string | null;
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function MultiYoungSearchSelect({
  value,
  onChange,
  disabled,
  placeholder = "Selecionar jovens",
}: Props) {
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<string>("selected");

  const { data: youngs = [] } = useQuery<YoungOption[]>({
    queryKey: ["young-people-multi-select"],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_young_people_safe");
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string;
        full_name: string;
        status: string | null;
        trail_phase: string | null;
        profile_id: string | null;
      }>;
      const profileIds = rows.map((r) => r.profile_id).filter(Boolean) as string[];
      const { data: profiles } = profileIds.length
        ? await supabase
            .from("profiles")
            .select("id, avatar_url, email")
            .in("id", profileIds)
        : { data: [] as { id: string; avatar_url: string | null; email: string | null }[] };
      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, { avatar_url: p.avatar_url, email: p.email }]),
      );
      return rows.map((r) => {
        const prof = r.profile_id ? profileMap.get(r.profile_id) : undefined;
        return {
          id: r.id,
          full_name: r.full_name ?? "Sem nome",
          status: r.status ?? null,
          trail_phase: r.trail_phase ?? null,
          avatar_url: prof?.avatar_url ?? null,
          email: prof?.email ?? null,
        };
      });
    },
  });

  const selected = youngs.filter((y) => value.includes(y.id));

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const handleVisibilityChange = (val: string) => {
    setVisibility(val);
    if (val === "all") {
      onChange(youngs.map(y => y.id));
    } else if (val === "admin_only") {
      onChange([]);
    } else {
      onChange([]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Quem pode acessar?</Label>
        <Select value={visibility} onValueChange={handleVisibilityChange} disabled={disabled}>
          <SelectTrigger className="w-full bg-muted/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Jovens</SelectItem>
            <SelectItem value="selected">Jovens Selecionados</SelectItem>
            <SelectItem value="admin_only">Apenas Administradores</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visibility === "selected" && (
        <div className="space-y-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                disabled={disabled}
                className="w-full justify-between font-normal"
              >
                <span className="truncate">
                  {selected.length === 0
                    ? placeholder
                    : `${selected.length} jovem${selected.length > 1 ? "s" : ""} selecionado${selected.length > 1 ? "s" : ""}`}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[--radix-popover-trigger-width] p-0"
              align="start"
            >
              <Command>
                <CommandInput placeholder="Buscar jovem..." />
                <CommandList>
                  <CommandEmpty>Nenhum jovem encontrado.</CommandEmpty>
                  <CommandGroup>
                    {youngs.map((y) => {
                      const isSel = value.includes(y.id);
                      return (
                        <CommandItem
                          key={y.id}
                          value={`${y.full_name} ${y.email ?? ""} ${y.status ?? ""}`}
                          onSelect={() => toggle(y.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              isSel ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={y.avatar_url ?? undefined} alt={y.full_name} />
                            <AvatarFallback className="text-[10px]">
                              {y.full_name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm truncate">{y.full_name}</span>
                            {y.email && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                {y.email}
                              </span>
                            )}
                            {(y.status || y.trail_phase) && (
                              <span className="text-[10px] text-muted-foreground">
                                {[y.status, y.trail_phase].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selected.map((y) => (
                <Badge key={y.id} variant="secondary" className="gap-1 pl-0.5">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={y.avatar_url ?? undefined} alt={y.full_name} />
                    <AvatarFallback className="text-[8px]">
                      {y.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {y.full_name}
                  <button
                    type="button"
                    onClick={() => toggle(y.id)}
                    className="hover:text-destructive"
                    aria-label={`Remover ${y.full_name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
