export type MeetingType =
  | "formacao_mentoria"
  | "checkin_operacional"
  | "comercial_cliente"
  | "gestao_mtx";

export type MeetingStatus = "agendada" | "realizada" | "cancelada";

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  formacao_mentoria: "Formação / Mentoria",
  checkin_operacional: "Check-in Operacional",
  comercial_cliente: "Comercial / Cliente",
  gestao_mtx: "Gestão MTX",
};

export const MEETING_TYPE_LIST: MeetingType[] = [
  "formacao_mentoria",
  "checkin_operacional",
  "comercial_cliente",
  "gestao_mtx",
];

// Background + text color classes per type
export const MEETING_TYPE_COLOR: Record<MeetingType, string> = {
  formacao_mentoria: "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30",
  checkin_operacional: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  comercial_cliente: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30",
  gestao_mtx: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30",
};

// Solid dot color for calendar markers
export const MEETING_TYPE_DOT: Record<MeetingType, string> = {
  formacao_mentoria: "bg-purple-500",
  checkin_operacional: "bg-emerald-500",
  comercial_cliente: "bg-blue-500",
  gestao_mtx: "bg-red-500",
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

export const RECURRENCE_OPTIONS = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
] as const;

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  is_recurring: boolean | null;
  recurrence_rule: string | null;
  responsible_id: string | null;
  agenda: string | null;
  objectives: string | null;
  decisions: string | null;
  next_steps: string | null;
  observations: string | null;
  status: MeetingStatus;
  link_opportunity_id: string | null;
  link_client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  young_id: string | null;
  profile_id: string | null;
  present: boolean | null;
  justification: string | null;
}

export interface MeetingAgendaItem {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  responsible_id: string | null;
  completed: boolean;
  position: number;
}

export interface MeetingActionItem {
  id: string;
  meeting_id: string;
  description: string;
  responsible_id: string | null;
  task_id: string | null;
  position: number;
  created_at: string;
}
