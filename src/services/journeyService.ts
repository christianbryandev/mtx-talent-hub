import { supabase } from "@/integrations/supabase/client";

export type PhaseStatus =
  | "bloqueada"
  | "reprovada"
  | "aguardando_quiz"
  | "nao_iniciada"
  | "em_andamento"
  | "concluida";

export interface JourneyChecklistItem {
  id: string;
  title: string;
  required: boolean;
  order_index: number;
  completed: boolean;
}
export interface JourneyLink {
  label: string;
  url: string;
}
export interface JourneyAttachment {
  label: string;
  url: string;
}
export interface JourneyCard {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  materials: string | null;
  links: JourneyLink[];
  attachments: JourneyAttachment[];
  order_index: number;
  xp_reward: number;
  completed: boolean;
  items: JourneyChecklistItem[];
}
export interface JourneyPhase {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  has_quiz: boolean;
  xp_reward: number;
  status: PhaseStatus;
  raw_status: "pendente" | "em_andamento" | "concluido";
  unlocked: boolean;
  cards_total: number;
  cards_done: number;
  last_quiz_score: number | null;
  cards: JourneyCard[];
}
export interface UserJourney {
  phases: JourneyPhase[];
  overall_progress: number;
  total_xp: number;
  total_items: number;
  done_items: number;
}

export class ServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ServiceError";
  }
}

function normalize(error: unknown, fallbackCode: string): ServiceError {
  if (error instanceof ServiceError) return error;
  const msg = error instanceof Error ? error.message : "Erro inesperado.";
  return new ServiceError(fallbackCode, msg);
}

export const journeyService = {
  async getUserJourney(userId: string): Promise<UserJourney> {
    try {
      const { data, error } = await supabase.rpc("get_user_journey", { _user_id: userId });
      if (error) throw new ServiceError("rpc_error", error.message);
      return data as unknown as UserJourney;
    } catch (e) {
      throw normalize(e, "get_user_journey_failed");
    }
  },

  async toggleChecklistItem(userId: string, itemId: string, completed: boolean) {
    try {
      const { data, error } = await supabase.rpc("toggle_checklist_item", {
        _user_id: userId,
        _item_id: itemId,
        _completed: completed,
      });
      if (error) throw new ServiceError("rpc_error", error.message);
      return data;
    } catch (e) {
      throw normalize(e, "toggle_checklist_item_failed");
    }
  },
};

