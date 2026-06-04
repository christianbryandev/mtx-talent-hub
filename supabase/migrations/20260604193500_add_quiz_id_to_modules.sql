ALTER TABLE public.journey_modules ADD COLUMN IF NOT EXISTS quiz_id UUID REFERENCES public.quiz_templates(id) ON DELETE SET NULL;
