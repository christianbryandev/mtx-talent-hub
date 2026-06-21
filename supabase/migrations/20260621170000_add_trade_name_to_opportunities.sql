-- Add trade_name column to opportunities for capture form data
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS trade_name text DEFAULT NULL;
