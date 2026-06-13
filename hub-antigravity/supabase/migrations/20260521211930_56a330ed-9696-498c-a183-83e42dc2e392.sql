-- Prevent duplicate phase assignments per young
ALTER TABLE public.journey_phase_assignees
  DROP CONSTRAINT IF EXISTS journey_phase_assignees_unique;
ALTER TABLE public.journey_phase_assignees
  ADD CONSTRAINT journey_phase_assignees_unique UNIQUE (phase_id, young_id);