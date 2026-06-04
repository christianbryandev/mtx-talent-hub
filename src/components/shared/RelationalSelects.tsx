import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SearchSelect } from "./SearchSelect";

interface BaseProps {
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
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

export function ServiceSearchSelect(props: BaseProps) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["search-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category, status")
        .order("name");
      if (error) throw error;
      return data ?? [];
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
        id: s.id,
        label: s.name,
        hint: [s.category, s.status].filter(Boolean).join(" · ") || null,
      }))}
    />
  );
}

export function ProfileSearchSelect(props: BaseProps & { roleFilter?: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["search-profiles", props.roleFilter],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_active", true);

      if (props.roleFilter) {
        const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", props.roleFilter);
        const userIds = roles?.map((r: any) => r.user_id) || [];
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
    <SearchSelect
      {...props}
      loading={isLoading}
      placeholder={props.placeholder ?? "Selecionar usuário"}
      searchPlaceholder="Buscar usuário..."
      emptyText="Nenhum usuário encontrado."
      options={data.map((p) => ({
        id: p.id,
        label: p.full_name || p.email || "Sem nome",
        hint: p.full_name ? p.email : null,
      }))}
    />
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
