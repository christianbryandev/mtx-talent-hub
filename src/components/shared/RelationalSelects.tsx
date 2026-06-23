import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchSelect } from "./SearchSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BaseProps {
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  clearText?: string;
}

export function ClientSearchSelect(props: BaseProps) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["search-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, trade_name, status")
        .order("company_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <SearchSelect
      {...props}
      loading={isLoading}
      placeholder={props.placeholder ?? "Selecionar cliente"}
      searchPlaceholder="Buscar cliente..."
      emptyText="Nenhum cliente encontrado."
      options={data.map((c) => ({
        id: c.id,
        label: c.company_name,
        hint: [c.trade_name, c.status].filter(Boolean).join(" · ") || null,
      }))}
    />
  );
}

export function ServiceSearchSelect(props: BaseProps & { clientId?: string | null }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["search-services", props.clientId ?? "all"],
    queryFn: async () => {
      if (props.clientId) {
        // Show services contracted by this client
        const { data: clientServices, error } = await supabase
          .from("client_services")
          .select("service_id, service_name, status")
          .eq("client_id", props.clientId)
          .eq("status", "ativo");
        if (error) throw error;
        // Also fetch all services as fallback options
        const { data: allServices } = await supabase
          .from("services_public")
          .select("id, name, category, status")
          .order("name");
        const clientServiceIds = new Set((clientServices ?? []).map((s) => s.service_id));
        const merged = (allServices ?? []).map((s) => ({
          ...s,
          isClientService: clientServiceIds.has(s.id),
        }));
        // Client services first, then others
        merged.sort((a, b) => (a.isClientService === b.isClientService ? 0 : a.isClientService ? -1 : 1));
        return merged;
      }
      const { data, error } = await supabase
        .from("services_public")
        .select("id, name, category, status")
        .order("name");
      if (error) throw error;
      return (data ?? []).map((s) => ({ ...s, isClientService: false }));
    },
  });
  return (
    <SearchSelect
      {...props}
      loading={isLoading}
      placeholder={props.placeholder ?? "Selecionar serviço"}
      searchPlaceholder="Buscar serviço..."
      emptyText="Nenhum serviço encontrado."
      options={data.map((s) => ({
        id: s.id ?? "",
        label: s.name ?? "",
        hint: [(s as any).isClientService ? "★ Contratado" : null, s.category, s.status].filter(Boolean).join(" · ") || null,
      }))}
    />
  );
}

export function ProfileSearchSelect(props: BaseProps & { roleFilter?: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["search-profiles", props.roleFilter, props.value],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true);

      if (props.roleFilter) {
        const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", props.roleFilter as any);
        const userIds = roles?.map((r: any) => r.user_id) || [];
        
        // Always include the current value if it is defined and not already in userIds
        if (props.value && !userIds.includes(props.value)) {
          userIds.push(props.value);
        }

        if (userIds.length > 0) {
          query = query.in("id", userIds);
        } else {
          return [];
        }
      }

      const { data, error } = await query.order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Select
      value={props.value || "none"}
      onValueChange={(val) => props.onChange(val === "none" ? null : val)}
      disabled={props.disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={props.placeholder ?? "Selecionar usuário"} />
      </SelectTrigger>
      <SelectContent>
        {props.allowClear && (
          <SelectItem value="none">
            {props.clearText ?? "— Nenhum —"}
          </SelectItem>
        )}
        {data.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.full_name || p.email || "Sem nome"}
          </SelectItem>
        ))}
        {data.length === 0 && !isLoading && !props.allowClear && (
          <SelectItem value="empty" disabled>
            Nenhum usuário encontrado.
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

export function OpportunitySearchSelect(props: BaseProps) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["search-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id, company_name, funnel_stage, status")
        .order("company_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <SearchSelect
      {...props}
      loading={isLoading}
      placeholder={props.placeholder ?? "Selecionar oportunidade"}
      searchPlaceholder="Buscar oportunidade..."
      emptyText="Nenhuma oportunidade encontrada."
      options={data.map((o) => ({
        id: o.id,
        label: o.company_name,
        hint: [o.funnel_stage, o.status].filter(Boolean).join(" · ") || null,
      }))}
    />
  );
}
