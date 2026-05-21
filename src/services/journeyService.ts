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

export const journeyService = {
  async getUserJourney(userId: string): Promise<UserJourney> {
    const { data, error } = await supabase.rpc("get_user_journey", { _user_id: userId });
    if (error) throw error;
    return data as unknown as UserJourney;
  },

  async toggleChecklistItem(userId: string, itemId: string, completed: boolean) {
    const { data, error } = await supabase.rpc("toggle_checklist_item", {
      _user_id: userId,
      _item_id: itemId,
      _completed: completed,
    });
    if (error) throw error;
    return data;
  },

};
