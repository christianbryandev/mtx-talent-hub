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
  onChange: (ids: string[], totalSum?: number) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ServiceMultiSelect({
  value,
  onChange,
  disabled,
  placeholder = "Selecione serviços",
}: Props) {
  const [open, setOpen] = useState(false);

  const { data: services = [] } = useQuery({
    queryKey: ["services-active-with-price"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category, base_price")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = services.filter((s) => value.includes(s.id));

  const toggle = (id: string) => {
    let newIds = [];
    if (value.includes(id)) newIds = value.filter((v) => v !== id);
    else newIds = [...value, id];
    
    const newSelected = services.filter((s) => newIds.includes(s.id));
    const totalSum = newSelected.reduce((sum, s) => {
       const bp = (s as any).base_price;
       let num = 0;
       if (typeof bp === 'number') {
           num = bp;
       } else if (typeof bp === 'string') {
           num = Number(bp.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
       }
       return sum + (isNaN(num) ? 0 : num);
    }, 0);
    
    onChange(newIds, totalSum);
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
            {selected.length > 0
              ? `${selected.length} serviço(s) selecionado(s)`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar serviço..." />
            <CommandList>
              <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
              <CommandGroup>
                {services.map((s) => {
                  const isSel = value.includes(s.id);
                  return (
                    <CommandItem
                      key={s.id}
                      value={`${s.name} ${s.category ?? ""}`}
                      onSelect={() => toggle(s.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSel ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm">{s.name}</span>
                        {s.category && (
                          <span className="text-[10px] text-muted-foreground">
                            {s.category}
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
          {selected.map((s) => (
            <Badge key={s.id} variant="secondary" className="gap-1">
              {s.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="ml-1 rounded-sm hover:bg-muted-foreground/20"
                  aria-label={`Remover ${s.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
