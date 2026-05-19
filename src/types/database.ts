// Tipos compartilhados de banco — complementa src/types/index.ts.
// Não remover nada daqui sem checar usos.

import type { AppRole } from "./index";

export type UserRole = AppRole;

export type EditRequestStatus = "pendente" | "aprovada" | "recusada";

export type JourneyPhase = "fase_1" | "fase_2" | "fase_3" | "fase_4" | "fase_5";

export type JourneyPhaseStatus = "pendente" | "em_andamento" | "concluido";

export type TaskKanbanColumn = "a_fazer" | "em_andamento" | "concluido";

export interface TrainingLink {
  label: string;
  url: string;
}

export interface ChecklistItem {
  item: string;
  completed: boolean;
}

export interface EditRequestedFields {
  estimated_value?: number;
  closing_probability?: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  status: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OpportunityService {
  id: string;
  opportunity_id: string;
  service_id: string;
  created_at: string;
  service?: Service;
}

export interface EditRequest {
  id: string;
  requester_id: string;
  entity_type: string;
  entity_id: string;
  requested_fields: EditRequestedFields;
  reason: string;
  status: EditRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  approved_until: string | null;
  created_at: string;
  requester?: Profile;
  reviewer?: Profile;
}

export interface JourneyPhaseCard {
  id: string;
  young_id: string;
  phase: JourneyPhase;
  title: string;
  description: string | null;
  training_links: TrainingLink[];
  checklist: ChecklistItem[];
  position: number;
  status: JourneyPhaseStatus;
  created_at: string;
  updated_at: string;
}
