-- Fix: "Allow public select on clients" has USING(true) which allows
-- ANY authenticated user to see ALL clients, bypassing all other RLS policies.
-- The briefing pre-fill is already covered by "Anon read client for briefing" (TO anon).
-- Also remove "Allow public insert to clients" which has no WITH CHECK restriction.

DROP POLICY IF EXISTS "Allow public select on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public insert to clients" ON public.clients;
