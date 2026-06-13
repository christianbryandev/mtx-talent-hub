export type AppRole =
  | "super_admin"
  | "admin"
  | "comercial"
  | "jovem_aprendiz"
  | "cliente";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_active: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithRole extends Profile {
  role: AppRole | null;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  created_at: string;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  comercial: "Comercial",
  jovem_aprendiz: "Jovem Aprendiz",
  cliente: "Cliente",
};

export const ROLE_PRECEDENCE: AppRole[] = [
  "super_admin",
  "admin",
  "comercial",
  "jovem_aprendiz",
  "cliente",
];

// ============ Jovens ============
export type YoungStatus =
  | "inscrito"
  | "em_analise"
  | "aprovado"
  | "em_formacao"
  | "em_pratica"
  | "ativo"
  | "pausado"
  | "desligado"
  | "concluido";

export type TrailPhase = "fase_1" | "fase_2" | "fase_3" | "fase_4" | "fase_5";

export const YOUNG_STATUS_LABELS: Record<YoungStatus, string> = {
  inscrito: "Inscrito",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  em_formacao: "Em formação",
  em_pratica: "Em prática",
  ativo: "Ativo",
  pausado: "Pausado",
  desligado: "Desligado",
  concluido: "Concluído",
};

export const YOUNG_STATUS_LIST: YoungStatus[] = [
  "inscrito",
  "em_analise",
  "aprovado",
  "em_formacao",
  "em_pratica",
  "ativo",
  "pausado",
  "desligado",
  "concluido",
];

/** @deprecated Use o catálogo da jornada (journey_phase_catalog) como SSOT */
export const TRAIL_PHASE_LABELS: Record<TrailPhase, string> = {
  fase_1: "Fase 1 — Fundamentos",
  fase_2: "Fase 2 — Capacitação Técnica",
  fase_3: "Fase 3 — Vocação e Ênfase",
  fase_4: "Fase 4 — Aplicação Prática",
  fase_5: "Fase 5 — Geração de Valor e Renda",
};

export const TRAIL_PHASE_LIST: TrailPhase[] = [
  "fase_1",
  "fase_2",
  "fase_3",
  "fase_4",
  "fase_5",
];

export type ApplicationStatus = "pendente" | "em_analise" | "aprovado" | "reprovado";

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

export interface YoungPerson {
  id: string;
  full_name: string;
  photo_url: string | null;
  birth_date: string | null;
  age: number | null;
  cpf: string | null;
  rg: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  mother_name: string | null;
  father_name: string | null;
  legal_guardian: string | null;
  guardian_contact: string | null;
  education_level: string | null;
  school: string | null;
  current_situation: string | null;
  family_income: string | null;
  people_at_home: number | null;
  social_context: string | null;
  testimony: string | null;
  dreams: string | null;
  skills: string | null;
  interest_area: string | null;
  vocation_area: string | null;
  status: YoungStatus;
  trail_phase: TrailPhase | null;
  entry_date: string | null;
  mentor_id: string | null;
  availability: string | null;
  has_laptop: boolean;
  has_phone: boolean;
  has_internet: boolean;
  has_professional_chip: boolean;
  has_cnpj: boolean;
  cnpj_type: string | null;
  cnpj_opening_date: string | null;
  pix_key: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  first_client_attended: boolean;
  first_client_date: string | null;
  total_income_generated: number;
  observations: string | null;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
  last_progress_at: string;
}

export interface YoungApplication {
  id: string;
  full_name: string;
  age: number | null;
  birth_date: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  education_level: string | null;
  currently_studying: boolean | null;
  currently_working: boolean | null;
  family_income: string | null;
  personal_story: string | null;
  dreams: string | null;
  why_mtx: string | null;
  perceived_skills: string | null;
  has_laptop: boolean | null;
  has_phone: boolean | null;
  has_internet: boolean | null;
  interest_area: string | null;
  how_found_mtx: string | null;
  data_authorization: boolean;
  guardian_authorization: boolean | null;
  status: ApplicationStatus;
  created_at: string;
}

export interface YoungEvolution {
  id: string;
  young_id: string;
  recorded_by: string | null;
  type: "status_change" | "phase_change" | "note" | "achievement";
  previous_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: string;
}

export const INTEREST_AREAS = [
  "Marketing",
  "Vendas",
  "Tecnologia",
  "Design",
  "Audiovisual",
  "Gestão",
  "Outro",
] as const;

export const HOW_FOUND_OPTIONS = [
  "Indicação de amigo",
  "Indicação de igreja / ONG",
  "Redes sociais",
  "Site da MTX",
  "Evento presencial",
  "Outro",
] as const;
