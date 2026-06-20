import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export interface ServicePaymentInfo {
  serviceId: string;
  paymentMethod: "unico" | "parcelado";
  installments: number;
}

interface Props {
  value: string[];
  onChange: (ids: string[], totalSum?: number) => void;
  disabled?: boolean;
  placeholder?: string;
  paymentInfo?: ServicePaymentInfo[];
  onPaymentChange?: (info: ServicePaymentInfo[]) => void;
}

export function ServiceMultiSelect({
  value,
  onChange,
  disabled,
  placeholder = "Selecione serviços",
  paymentInfo = [],
  onPaymentChange,
}: Props) {
  const [open, setOpen] = useState(false);

  const { data: services = [] } = useQuery({
    queryKey: ["services-active-with-price"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category, base_price, default_value, billing_model")
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
       const rawVal = (s as any).default_value ?? (s as any).base_price;
       let num = 0;
       if (typeof rawVal === 'number') {
           num = rawVal;
       } else if (typeof rawVal === 'string') {
           num = Number(rawVal.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
       }
       return sum + (isNaN(num) ? 0 : num);
    }, 0);

    onChange(newIds, totalSum);

    // Clean up payment info for removed services
    if (onPaymentChange) {
      onPaymentChange(paymentInfo.filter((p) => newIds.includes(p.serviceId)));
    }
  };

  const updatePayment = (serviceId: string, field: "paymentMethod" | "installments", val: any) => {
    if (!onPaymentChange) return;
    const existing = paymentInfo.find((p) => p.serviceId === serviceId);
    const updated: ServicePaymentInfo = existing
      ? { ...existing, [field]: val }
      : { serviceId, paymentMethod: "unico", installments: 1, [field]: val };
    onPaymentChange([
      ...paymentInfo.filter((p) => p.serviceId !== serviceId),
      updated,
    ]);
  };

  const pontualServices = selected.filter((s) => (s as any).billing_model === "pontual");

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
                        <span className="text-[10px] text-muted-foreground">
                          {s.category ?? ""}{(s as any).billing_model === "pontual" ? " • Pontual" : ""}
                        </span>
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

      {/* Payment options for pontual services */}
      {!disabled && pontualServices.length > 0 && onPaymentChange && (
        <div className="space-y-2 rounded-md border p-2 bg-muted/30">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Forma de pagamento (serviços pontuais)</p>
          {pontualServices.map((s) => {
            const info = paymentInfo.find((p) => p.serviceId === s.id);
            const method = info?.paymentMethod ?? "unico";
            return (
              <div key={s.id} className="space-y-1">
                <Label className="text-xs font-medium">{s.name}</Label>
                <div className="flex items-center gap-2">
                  <Select value={method} onValueChange={(v) => updatePayment(s.id, "paymentMethod", v)}>
                    <SelectTrigger className="h-7 text-xs w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unico">À vista</SelectItem>
                      <SelectItem value="parcelado">Parcelado</SelectItem>
                    </SelectContent>
                  </Select>
                  {method === "parcelado" && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={2}
                        max={24}
                        className="h-7 w-16 text-xs"
                        value={info?.installments ?? 2}
                        onChange={(e) => updatePayment(s.id, "installments", Math.max(2, Number(e.target.value) || 2))}
                      />
                      <span className="text-xs text-muted-foreground">parcelas</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
