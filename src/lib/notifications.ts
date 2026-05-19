import {
  Bell,
  CheckSquare,
  AlertTriangle,
  Clock,
  UserPlus,
  FileText,
  CalendarClock,
  RefreshCw,
  Star,
  Video,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "tarefa_atribuida"
  | "tarefa_atrasada"
  | "prazo_proximo"
  | "nova_inscricao"
  | "briefing_preenchido"
  | "followup_atrasado"
  | "status_alterado"
  | "nova_oportunidade"
  | "reuniao_agendada"
  | "cliente_convertido"
  | "geral";

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: NotificationType;
  entity_type: string | null;
  entity_id: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export const NOTIFICATION_META: Record<
  NotificationType,
  { icon: LucideIcon; color: string; bg: string; label: string }
> = {
  tarefa_atribuida: { icon: CheckSquare, color: "text-blue-400", bg: "bg-blue-500/10", label: "Tarefa atribuída" },
  tarefa_atrasada: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", label: "Tarefa atrasada" },
  prazo_proximo: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", label: "Prazo próximo" },
  nova_inscricao: { icon: UserPlus, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", label: "Nova inscrição" },
  briefing_preenchido: { icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Briefing preenchido" },
  followup_atrasado: { icon: CalendarClock, color: "text-orange-400", bg: "bg-orange-500/10", label: "Follow-up atrasado" },
  status_alterado: { icon: RefreshCw, color: "text-zinc-300", bg: "bg-zinc-500/10", label: "Status alterado" },
  nova_oportunidade: { icon: Star, color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Nova oportunidade" },
  reuniao_agendada: { icon: Video, color: "text-indigo-400", bg: "bg-indigo-500/10", label: "Reunião agendada" },
  cliente_convertido: { icon: Trophy, color: "text-green-400", bg: "bg-green-500/10", label: "Cliente convertido" },
  geral: { icon: Bell, color: "text-zinc-300", bg: "bg-zinc-500/10", label: "Notificação" },
};

export const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  tasks: () => `/tarefas`,
  young_people: (id) => `/jovens/${id}`,
  young_applications: () => `/jovens/inscricoes`,
  clients: (id) => `/clientes/${id}`,
  opportunities: (id) => `/crm/${id}`,
  meetings: (id) => `/reunioes/${id}`,
  self_profile: () => `/meu-perfil`,
};

export function getNotificationRoute(n: Pick<NotificationRow, "entity_type" | "entity_id">): string | null {
  if (!n.entity_type) return null;
  const fn = ENTITY_ROUTES[n.entity_type];
  if (!fn) return null;
  return fn(n.entity_id ?? "");
}

export interface CreateNotificationInput {
  user_id: string;
  title: string;
  message?: string;
  type: NotificationType;
  entity_type?: string;
  entity_id?: string;
}

/**
 * Cria uma notificação para um usuário. Requer usuário autenticado (RLS).
 * Para múltiplos destinatários, passe um array.
 */
export async function createNotification(
  input: CreateNotificationInput | CreateNotificationInput[],
) {
  const rows = Array.isArray(input) ? input : [input];
  if (rows.length === 0) return;
  const { error } = await supabase.from("notifications").insert(
    rows.map((r) => ({
      user_id: r.user_id,
      title: r.title,
      message: r.message ?? null,
      type: r.type,
      entity_type: r.entity_type ?? null,
      entity_id: r.entity_id ?? null,
    })),
  );
  if (error) console.error("[notifications] insert failed:", error);
}

/** Busca IDs de todos os admins (super_admin + admin) para fanout. */
export async function getAdminUserIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["super_admin", "admin"]);
  if (error || !data) return [];
  return Array.from(new Set(data.map((r) => r.user_id)));
}
