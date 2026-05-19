import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
}

/**
 * Select com busca filtrável de jovens cadastrados.
 * Reutilizável em qualquer formulário que precise vincular um jovem.
 */
export function YoungSearchSelect({
  value,
  onChange,
  disabled,
  placeholder = "Selecionar jovem",
  excludeId,
}: Props) {
  const [open, setOpen] = useState(false);

  const { data: youngs = [] } = useQuery({
    queryKey: ["young-people-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("young_people")
        .select("id, full_name, status, trail_phase")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
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
          {current ? current.full_name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar jovem..." />
          <CommandList>
            <CommandEmpty>Nenhum jovem encontrado.</CommandEmpty>
            <CommandGroup>
              {list.map((y) => {
                const isSel = y.id === value;
                return (
                  <CommandItem
                    key={y.id}
                    value={`${y.full_name} ${y.status ?? ""}`}
                    onSelect={() => {
                      onChange(isSel ? null : y.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSel ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm">{y.full_name}</span>
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
  );
}
