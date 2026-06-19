-- 1) Make views run as the querying user (SECURITY INVOKER), enforcing RLS of the caller
ALTER VIEW public.vw_journey_ranking SET (security_invoker = true);
ALTER VIEW public.services_public SET (security_invoker = true);

-- 2) Stop broadcasting sensitive young_people PII (CPF, RG, bank data, pix_key) over Realtime.
-- The application does not subscribe to young_people changes via Realtime.
ALTER PUBLICATION supabase_realtime DROP TABLE public.young_people;