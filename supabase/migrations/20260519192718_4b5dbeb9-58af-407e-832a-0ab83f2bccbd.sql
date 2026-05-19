ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS profile_id uuid;
CREATE INDEX IF NOT EXISTS idx_clients_profile_id ON public.clients(profile_id);

-- Permite que o cliente (role 'cliente') visualize seus próprios dados
DROP POLICY IF EXISTS "Cliente view own client record" ON public.clients;
CREATE POLICY "Cliente view own client record"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());