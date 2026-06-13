export type KanbanColumn =
  | "backlog"
  | "a_fazer"
  | "em_andamento"
  | "em_revisao"
  | "concluido";

export const KANBAN_COLUMNS: { id: KanbanColumn; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "a_fazer", label: "A Fazer" },
  { id: "em_andamento", label: "Em Andamento" },
  { id: "em_revisao", label: "Em Revisão" },
  { id: "concluido", label: "Concluído" },
];

export const KANBAN_LABELS: Record<KanbanColumn, string> = KANBAN_COLUMNS.reduce(
  (acc, c) => {
    acc[c.id] = c.label;
    return acc;
  },
  {} as Record<KanbanColumn, string>,
);

export type TaskPriority = "baixa" | "media" | "alta" | "urgente";

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const PRIORITY_STYLE: Record<TaskPriority, string> = {
  urgente: "bg-destructive/15 text-destructive border-destructive/30",
  alta: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  media: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  baixa: "bg-muted text-muted-foreground border-border",
};

export type TaskArea =
  | "dev_hub"
  | "comercial"
  | "social_media"
  | "design"
  | "trafego"
  | "formacao";

export const TASK_AREAS: { value: TaskArea; label: string }[] = [
  { value: "dev_hub", label: "Dev / Hub" },
  { value: "comercial", label: "Comercial" },
  { value: "social_media", label: "Social Media" },
  { value: "design", label: "Design" },
  { value: "trafego", label: "Tráfego" },
  { value: "formacao", label: "Formação" },
];

export const TASK_AREA_LABELS: Record<TaskArea, string> = TASK_AREAS.reduce(
  (acc, a) => {
    acc[a.value] = a.label;
    return acc;
  },
  {} as Record<TaskArea, string>,
);

export const TASK_AREA_STYLE: Record<TaskArea, string> = {
  dev_hub: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30",
  comercial: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  social_media: "bg-pink-500/15 text-pink-600 dark:text-pink-300 border-pink-500/30",
  design: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/30",
  trafego: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  formacao: "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30",
};

export interface Task {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  service_id: string | null;
  opportunity_id: string | null;
  young_responsible: string | null;
  supervisor_id: string | null;
  kanban_column: KanbanColumn;
  position: number;
  priority: TaskPriority;
  due_date: string | null;
  start_date: string | null;
  estimated_hours: number | null;
  hours_realized: number | null;
  area: TaskArea | null;
  auto_generated: boolean;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Service {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  scope: string | null;
  deliverables: string | null;
  average_deadline: number | null;
  billing_model: string | null;
  default_value: number | null;
  status: string | null;
  is_active: boolean;
  base_price: number | null;
  service_type: string | null;
  responsible_area: string | null;
  executor_profile: string | null;
  frequency: string | null;
  pct_mtx: number | null;
  pct_commercial: number | null;
  pct_executor: number | null;
  default_executor_id: string | null;
  created_at: string;
  updated_at: string;
}

export const BILLING_MODELS = [
  { value: "mensal", label: "Mensal" },
  { value: "pontual", label: "Pontual" },
  { value: "por_entrega", label: "Por entrega" },
] as const;

export const SERVICE_TYPES = [
  { value: "recorrente", label: "Recorrente" },
  { value: "pontual", label: "Pontual" },
  { value: "projeto", label: "Projeto" },
] as const;

export const RESPONSIBLE_AREAS = [
  { value: "marketing", label: "Marketing" },
  { value: "design", label: "Design" },
  { value: "trafego", label: "Tráfego" },
  { value: "social_media", label: "Social Media" },
  { value: "comercial", label: "Comercial" },
  { value: "desenvolvimento", label: "Desenvolvimento" },
  { value: "outros", label: "Outros" },
] as const;

export const SERVICE_FREQUENCIES = [
  { value: "diaria", label: "Diária" },
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "unica", label: "Única" },
] as const;

export interface ServiceTaskTemplate {
  id: string;
  service_id: string;
  name: string;
  task_type: string | null;
  responsible_area: string | null;
  default_deadline_days: number | null;
  position: number;
}

export interface ServiceOnboardingItem {
  id: string;
  service_id: string;
  item: string;
  position: number;
}
