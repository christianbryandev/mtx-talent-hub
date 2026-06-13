-- Ensure quiz_questions has 'type'
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'multipla_escolha' CHECK (type IN ('multipla_escolha', 'texto'));

-- Create table for storing user answers
CREATE TABLE IF NOT EXISTS public.quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.young_quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    option_id UUID REFERENCES public.quiz_options(id) ON DELETE CASCADE, -- For multiple choice
    text_answer TEXT, -- For free text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grants
GRANT ALL ON public.quiz_answers TO authenticated;
GRANT ALL ON public.quiz_answers TO service_role;

-- Enable RLS
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all answers" ON public.quiz_answers FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));
CREATE POLICY "Users can insert their own answers" ON public.quiz_answers FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.young_quiz_attempts WHERE id = attempt_id AND young_id = auth.uid()));
