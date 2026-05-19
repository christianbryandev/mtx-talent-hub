import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

/** Multi-select de jovens com busca filtrável. */
export function MultiYoungSearchSelect({
  value,
  onChange,
  disabled,
  placeholder = "Selecionar jovens",
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

  const selected = youngs.filter((y) => value.includes(y.id));

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  return (
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
                      value={`${y.full_name} ${y.status ?? ""}`}
                      onSelect={() => toggle(y.id)}
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

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((y) => (
            <Badge key={y.id} variant="secondary" className="gap-1">
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
  );
}
