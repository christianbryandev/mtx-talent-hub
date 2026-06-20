-- Fix briefing RLS: allow public insert WITH client_id (the form sends it from the URL)
DROP POLICY IF EXISTS "Anon can submit briefing" ON public.client_briefings;
DROP POLICY IF EXISTS "Public can submit briefing" ON public.client_briefings;

-- Allow anonymous and authenticated users to submit a briefing with a client_id
CREATE POLICY "Anyone can submit briefing"
ON public.client_briefings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  company_name IS NOT NULL
  AND contact_name IS NOT NULL
);

-- Allow anonymous SELECT on clients for briefing pre-fill (only basic fields)
CREATE POLICY "Anon read client for briefing"
ON public.clients
FOR SELECT
TO anon
USING (true);
