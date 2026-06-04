import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  excludeId?: string;
  allowClear?: boolean;
  clearText?: string;
}

interface YoungOption {
  id: string;
  full_name: string;
  status: string | null;
  trail_phase: string | null;
  avatar_url: string | null;
  email: string | null;
}

/**
 * Select com busca filtrável de jovens cadastrados.
 * Mostra avatar + email para diferenciar jovens com nomes iguais.
 */
export function YoungSearchSelect({
  value,
  onChange,
  disabled,
  placeholder = "Selecionar jovem",
  excludeId,
  allowClear = false,
  clearText = "— Nenhum —",
}: Props) {
  const [open, setOpen] = useState(false);

  const { data: youngs = [] } = useQuery<YoungOption[]>({
    queryKey: ["young-people-search-select"],
    staleTime: 0,
    refetchOnMount: "always",
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


  const list = excludeId ? youngs.filter((y) => y.id !== excludeId) : youngs;
  const current = youngs.find((y) => y.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {current ? (
            <span className="flex items-center gap-2 min-w-0">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage src={current.avatar_url ?? undefined} alt={current.full_name} />
                <AvatarFallback className="text-[9px]">
                  {current.full_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{current.full_name}</span>
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar jovem..." />
          <CommandList>
            <CommandEmpty>Nenhum jovem encontrado.</CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className={cn("pr-8", !value && "bg-accent text-accent-foreground")}
                >
                  <span className="text-sm">
                    {clearText}
                  </span>
                  {!value && (
                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4 shrink-0" />
                    </span>
                  )}
                </CommandItem>
              )}
              {list.map((y) => {
                const isSel = y.id === value;
                return (
                  <CommandItem
                    key={y.id}
                    value={`${y.full_name} ${y.email ?? ""} ${y.status ?? ""} ${y.id}`}
                    onSelect={() => {
                      onChange(isSel ? null : y.id);
                      setOpen(false);
                    }}
                    className={cn("pr-8", isSel && "bg-accent text-accent-foreground")}
                  >
                    <Avatar className="h-6 w-6 mr-2 shrink-0">
                      <AvatarImage src={y.avatar_url ?? undefined} alt={y.full_name} />
                      <AvatarFallback className="text-[10px]">
                        {y.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm truncate">{y.full_name}</span>
                      {y.email && (
                        <span className="text-[10px] text-muted-foreground opacity-80 truncate">
                          {y.email}
                        </span>
                      )}
                      {(y.status || y.trail_phase) && (
                        <span className="text-[10px] text-muted-foreground opacity-80">
                          {[y.status, y.trail_phase].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                    {isSel && (
                      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-4 w-4 shrink-0" />
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
