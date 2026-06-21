-- Add currently_studying and currently_working columns to young_people
-- These fields exist in young_applications and are copied during profile creation
ALTER TABLE public.young_people
  ADD COLUMN IF NOT EXISTS currently_studying boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS currently_working boolean DEFAULT NULL;
