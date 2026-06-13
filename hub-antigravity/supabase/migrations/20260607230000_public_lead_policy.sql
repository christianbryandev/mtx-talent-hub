-- Allow anonymous users to insert new clients as 'lead'
DROP POLICY IF EXISTS "Anon can insert lead" ON public.clients;
CREATE POLICY "Anon can insert lead"
  ON public.clients
  FOR INSERT
  TO anon
  WITH CHECK (status = 'lead');
