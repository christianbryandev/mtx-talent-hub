export type MeetingType =
  | "geral_jovens"
  | "mentoria"
  | "operacional"
  | "comercial"
  | "alinhamento_entrega";

export type MeetingStatus = "agendada" | "realizada" | "cancelada";

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  geral_jovens: "Geral Jovens",
  mentoria: "Mentoria",
  operacional: "Operacional",
  comercial: "Comercial",
  alinhamento_entrega: "Alinhamento de Entrega",
};

export const MEETING_TYPE_LIST: MeetingType[] = [
  "geral_jovens",
  "mentoria",
  "operacional",
  "comercial",
  "alinhamento_entrega",
];

// Background + text color classes per type
export const MEETING_TYPE_COLOR: Record<MeetingType, string> = {
  geral_jovens: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  mentoria: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  operacional: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  comercial: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  alinhamento_entrega: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
};

// Solid dot color for calendar markers
export const MEETING_TYPE_DOT: Record<MeetingType, string> = {
  geral_jovens: "bg-blue-500",
  mentoria: "bg-purple-500",
  operacional: "bg-amber-500",
  comercial: "bg-emerald-500",
  alinhamento_entrega: "bg-orange-500",
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
