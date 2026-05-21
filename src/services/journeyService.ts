import { supabase } from "@/integrations/supabase/client";

export interface JourneyChecklistItem {
  id: string;
  title: string;
  required: boolean;
  order_index: number;
  completed: boolean;
}
export interface JourneyCard {
  id: string;
  title: string;
  description: string | null;
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
  status: "pendente" | "em_andamento" | "concluido";
  unlocked: boolean;
  cards_total: number;
  cards_done: number;
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

  async markChecklistItem(userId: string, itemId: string) {
    const { data, error } = await supabase.rpc("mark_checklist_item", {
      _user_id: userId,
      _item_id: itemId,
    });
    if (error) throw error;
    return data;
  },

  async submitQuizAttempt(userId: string, phaseId: string, score: number) {
    const { data, error } = await supabase.rpc("submit_quiz_attempt", {
      _user_id: userId,
      _phase_id: phaseId,
      _score: score,
    });
    if (error) throw error;
    return data;
  },

  async processXpEvent(userId: string, eventType: string, referenceId: string, xpAmount: number) {
    const { data, error } = await supabase.rpc("process_xp_event", {
      _user_id: userId,
      _event_type: eventType,
      _reference_id: referenceId,
      _xp_amount: xpAmount,
    });
    if (error) throw error;
    return data;
  },
};
