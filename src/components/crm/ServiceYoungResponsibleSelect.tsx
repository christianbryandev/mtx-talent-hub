import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  serviceId: string;
  serviceName: string;
  value: string | null;
  onChange: (youngId: string | null) => void;
  disabled?: boolean;
}

export function ServiceYoungResponsibleSelect({
  serviceId,
  serviceName,
  value,
  onChange,
  disabled,
}: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const autoFilledRef = useRef(false);

  const { data: youngs = [], isLoading } = useQuery({
    queryKey: ["service-youngs", serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_young_people")
        .select("young_id, young_people!inner(id, full_name, photo_url)")
        .eq("service_id", serviceId);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.young_people.id as string,
        full_name: row.young_people.full_name as string,
        photo_url: row.young_people.photo_url as string | null,
      }));
    },
    enabled: !!serviceId,
  });

  // Auto-preencher quando há apenas 1 jovem vinculado
  useEffect(() => {
    if (youngs.length === 1 && !value && !autoFilledRef.current) {
      autoFilledRef.current = true;
      onChangeRef.current(youngs[0].id);
    }
  }, [youngs, value]);

  // Reset auto-fill flag quando serviceId muda
  useEffect(() => {
    autoFilledRef.current = false;
  }, [serviceId]);

  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground py-1">
        Carregando responsáveis de {serviceName}...
      </div>
    );
  }

  if (youngs.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-1 flex items-center gap-1.5">
        <User className="h-3 w-3" />
        <span>{serviceName}: Nenhum jovem vinculado</span>
      </div>
    );
  }

  if (youngs.length === 1) {
    return (
      <div className="text-xs py-1 flex items-center gap-1.5">
        <User className="h-3 w-3 text-green-600" />
        <span className="text-muted-foreground">{serviceName}:</span>
        <span className="font-medium">{youngs[0].full_name}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {serviceName}:
      </span>
      <Select
        value={value ?? ""}
        onValueChange={(v) => onChange(v || null)}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 text-xs flex-1">
          <SelectValue placeholder="Selecionar jovem responsável" />
        </SelectTrigger>
        <SelectContent>
          {youngs.map((y) => (
            <SelectItem key={y.id} value={y.id}>
              {y.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
