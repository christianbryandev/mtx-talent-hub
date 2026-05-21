import { supabase } from "@/integrations/supabase/client";

export type QuizMediaType = "image" | "video";
export interface QuizOption {
  id: string;
  text: string;
  order_index: number;
  media_url?: string | null;
  media_type?: QuizMediaType | null;
}
export interface QuizQuestion {
  id: string;
  question: string;
  type: string;
  order_index: number;
  media_url?: string | null;
  media_type?: QuizMediaType | null;
  options: QuizOption[];
}
export interface PhaseQuiz {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  version: number;
  already_passed: boolean;
  questions: QuizQuestion[];
}
export interface QuizSubmitResult {
  score: number;
  passed: boolean;
  attempt_number: number;
  correct: number;
  total: number;
  passing_score: number;
  idempotent?: boolean;
}

export class ServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ServiceError";
  }
}

function normalizeError(error: unknown, fallbackCode = "unknown_error"): ServiceError {
  if (error instanceof ServiceError) return error;
  const msg = error instanceof Error ? error.message : "Erro inesperado.";
  return new ServiceError(fallbackCode, msg);
}

export const quizService = {
  async getPhaseQuiz(phaseId: string): Promise<PhaseQuiz | null> {
    try {
      const { data, error } = await supabase.rpc("get_phase_quiz" as never, {
        _phase_id: phaseId,
      } as never);
      if (error) throw new ServiceError("rpc_error", error.message);
      return (data as unknown as PhaseQuiz) ?? null;
    } catch (e) {
      throw normalizeError(e, "get_phase_quiz_failed");
    }
  },

  async submitPhaseQuiz(
    phaseId: string,
    answers: { question_id: string; option_id: string }[],
  ): Promise<QuizSubmitResult> {
    try {
      const { data, error } = await supabase.rpc("submit_phase_quiz" as never, {
        _phase_id: phaseId,
        _answers: answers,
      } as never);
      if (error) throw new ServiceError("rpc_error", error.message);

      const res = data as unknown as
        | (QuizSubmitResult & { success: true })
        | { success: false; error: { code: string; message: string } };

      if (!res || typeof res !== "object" || !("success" in res)) {
        throw new ServiceError("invalid_response", "Resposta inválida do servidor.");
      }
      if (!res.success) {
        throw new ServiceError(res.error?.code ?? "unknown_error", res.error?.message ?? "Falha ao enviar quiz.");
      }
      return res;
    } catch (e) {
      throw normalizeError(e, "submit_phase_quiz_failed");
    }
  },
};
