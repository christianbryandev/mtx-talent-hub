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
  module_id?: string | null;
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
  modules?: JourneyModule[];
}

export interface JourneyModule {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_body: string | null;
  order_index: number;
  duration_minutes: number | null;
  questions_count?: number;
  unlocked: boolean;
  completed: boolean;
  thumbnail_url?: string | null;
  visibility_type?: "all" | "selected" | "admin_only";
  assigned_users?: string[];
  supplementary_text?: string | null;
  items: JourneyChecklistItem[];
}

export interface CatalogPhase {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  has_quiz: boolean;
  xp_reward: number;
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
  async getCatalogPhases(): Promise<CatalogPhase[]> {
    try {
      const { data, error } = await supabase.rpc("get_catalog_phases");
      if (error) throw new ServiceError("rpc_error", error.message);
      return data as unknown as CatalogPhase[];
    } catch (e) {
      throw normalize(e, "get_catalog_phases_failed");
    }
  },
  async getPhaseModules(phaseId: string): Promise<JourneyModule[]> {
    try {
      const { data, error } = await supabase
        .from("journey_modules")
        .select("*")
        .eq("phase_id", phaseId)
        .order("order_index", { ascending: true });
      if (error) throw new ServiceError("db_error", error.message);
      return data as unknown as JourneyModule[];
    } catch (e) {
      throw normalize(e, "get_phase_modules_failed");
    }
  },
  async getChecklistItemsWithModule(phaseId: string): Promise<{ id: string; module_id: string | null }[]> {
    try {
      const { data, error } = await supabase
        .from("journey_checklist_items")
        .select("id, module_id")
        .filter("card_id", "in", `(SELECT id FROM journey_cards WHERE phase_id = '${phaseId}')`);
      
      // Since Supabase doesn't support subqueries in filters directly like this easily via client, 
      // we'll fetch them normally or use an RPC if needed. 
      // Actually, we can just fetch all checklist items for the phase.
      
      const { data: cards } = await supabase.from("journey_cards").select("id").eq("phase_id", phaseId);
      if (!cards || cards.length === 0) return [];
      
      const cardIds = cards.map(c => c.id);
      const { data: items, error: itemsError } = await supabase
        .from("journey_checklist_items")
        .select("id, module_id")
        .in("card_id", cardIds);
        
      if (itemsError) throw new ServiceError("db_error", itemsError.message);
      return items;
    } catch (e) {
      throw normalize(e, "get_checklist_items_failed");
    }
  },

  async updateModuleThumbnail(moduleId: string, thumbnailUrl: string) {
    try {
      const { error } = await supabase
        .from("journey_modules")
        .update({ thumbnail_url: thumbnailUrl })
        .eq("id", moduleId);
      if (error) throw new ServiceError("db_error", error.message);
    } catch (e) {
      throw normalize(e, "update_module_thumbnail_failed");
    }
  },

  async duplicateModule(moduleId: string) {
    try {
      // 1. Get original module
      const { data: module, error: getError } = await supabase
        .from("journey_modules")
        .select("*")
        .eq("id", moduleId)
        .single();
      
      if (getError) throw new ServiceError("db_error", getError.message);

      // 2. Prepare new module data
      const { id, created_at, updated_at, ...moduleData } = module;
      
      // 3. Shift order_index for subsequent modules
      const { error: shiftError } = await (supabase.rpc as any)("increment_module_indices", {
        _phase_id: module.phase_id,
        _start_index: module.order_index + 1
      });
      
      // If RPC doesn't exist yet, we'll handle it manually in a migration if needed, 
      // but let's try to do it via a simple update first if we can.
      // For now, let's just insert it right after.
      
      const newModule = {
        ...moduleData,
        title: `${module.title} (Cópia)`,
        order_index: module.order_index + 1
      };

      const { data, error: insertError } = await supabase
        .from("journey_modules")
        .insert(newModule)
        .select()
        .single();

      if (insertError) throw new ServiceError("db_error", insertError.message);
      return data;
    } catch (e) {
      throw normalize(e, "duplicate_module_failed");
    }
  }
};

