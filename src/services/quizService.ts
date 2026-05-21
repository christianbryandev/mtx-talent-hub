import { supabase } from "@/integrations/supabase/client";

export interface QuizOption {
  id: string;
  text: string;
  order_index: number;
}
export interface QuizQuestion {
  id: string;
  question: string;
  type: string;
  order_index: number;
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
}

export const quizService = {
  async getPhaseQuiz(phaseId: string): Promise<PhaseQuiz | null> {
    const { data, error } = await supabase.rpc("get_phase_quiz" as never, {
      _phase_id: phaseId,
    } as never);
    if (error) throw error;
    return (data as unknown as PhaseQuiz) ?? null;
  },

  async submitPhaseQuiz(
    phaseId: string,
    answers: { question_id: string; option_id: string }[],
  ): Promise<QuizSubmitResult> {
    const { data, error } = await supabase.rpc("submit_phase_quiz" as never, {
      _phase_id: phaseId,
      _answers: answers,
    } as never);
    if (error) throw error;
    return data as unknown as QuizSubmitResult;
  },
};
