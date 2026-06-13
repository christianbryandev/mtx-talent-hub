import { useState, type ReactNode } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

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

export interface SearchSelectOption {
  id: string;
  label: string;
  hint?: string | null;
  /** Texto extra usado pelo filtro do CommandInput (não exibido) */
  keywords?: string;
}

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  options: SearchSelectOption[];
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowClear?: boolean;
  clearText?: string;
  className?: string;
  renderOption?: (opt: SearchSelectOption) => ReactNode;
  primaryHighlight?: boolean;
}

/**
 * Select genérico com autocomplete/busca filtrável.
 * Use diretamente passando `options` ou via wrappers (ClientSearchSelect, etc).
 */
export function SearchSelect({
  value,
  onChange,
  options,
  loading,
  disabled,
  placeholder = "Selecionar",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum item encontrado.",
  allowClear = true,
  clearText = "— Nenhum —",
  className,
  renderOption,
  primaryHighlight = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled || loading}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate text-left">
            {current ? current.label : loading ? "Carregando..." : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem
                  value="__none__ nenhum"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className={cn(primaryHighlight && "pr-8", !value && primaryHighlight && "bg-accent text-accent-foreground")}
                >
                  {!primaryHighlight && (
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value ? "opacity-0" : "opacity-100",
                      )}
                    />
                  )}
                  <span className={cn("text-sm", !primaryHighlight && "text-muted-foreground")}>
                    {clearText}
                  </span>
                  {!value && primaryHighlight && (
                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </CommandItem>
              )}
              {options.map((o) => {
                const isSel = o.id === value;
                return (
                  <CommandItem
                    key={o.id}
                    value={`${o.label} ${o.hint ?? ""} ${o.keywords ?? ""}`}
                    onSelect={() => {
                      onChange(isSel ? null : o.id);
                      setOpen(false);
                    }}
                    className={cn(primaryHighlight && "pr-8", isSel && primaryHighlight && "bg-accent text-accent-foreground")}
                  >
                    {!primaryHighlight && (
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSel ? "opacity-100" : "opacity-0",
                        )}
                      />
                    )}
                    {renderOption ? (
                      renderOption(o)
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-sm">{o.label}</span>
                        {o.hint && (
                          <span className={cn("text-[10px] text-muted-foreground", primaryHighlight && "opacity-80")}>
                            {o.hint}
                          </span>
                        )}
                      </div>
                    )}
                    {isSel && primaryHighlight && (
                      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-4 w-4" />
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
