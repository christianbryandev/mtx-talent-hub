-- Add status to phases catalog
ALTER TABLE public.journey_phase_catalog 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'rascunho' CHECK (status IN ('publicado', 'rascunho'));

-- Add duration to modules
ALTER TABLE public.journey_modules
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Set some defaults for existing data
UPDATE public.journey_phase_catalog SET status = 'publicado' WHERE status IS NULL;
