-- 1. Remove the unique constraint that limits 1 active quiz per phase
DROP INDEX IF EXISTS public.quiz_templates_one_active_per_phase;

-- 2. Allow phase_id to be NULL so quizzes can exist independently or be drafted
ALTER TABLE public.quiz_templates ALTER COLUMN phase_id DROP NOT NULL;

-- 3. Migrate existing active quizzes into journey_modules
-- For each active quiz that is tied to a phase, we create a journey_module
-- of type 'quiz', where content_body holds the quiz UUID.
INSERT INTO public.journey_modules (phase_id, title, description, content_type, content_body, order_index)
SELECT 
  phase_id, 
  title, 
  description, 
  'quiz', 
  id::text, 
  999 -- put it at the end of the phase
FROM public.quiz_templates
WHERE is_active = true AND phase_id IS NOT NULL;
