import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
 * Select simples para jovens (padrão de imagem 2).
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
  const { data: youngs = [], isLoading } = useQuery<YoungOption[]>({
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

  return (
    <Select
      value={value || "none"}
      onValueChange={(val) => onChange(val === "none" ? null : val)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowClear && (
          <SelectItem value="none">
            {clearText}
          </SelectItem>
        )}
        {list.map((y) => (
          <SelectItem key={y.id} value={y.id}>
            {y.full_name}
          </SelectItem>
        ))}
        {list.length === 0 && !isLoading && !allowClear && (
          <SelectItem value="empty" disabled>
            Nenhum jovem encontrado.
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
