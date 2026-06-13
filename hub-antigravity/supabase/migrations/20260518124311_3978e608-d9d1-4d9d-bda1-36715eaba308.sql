
-- =========================================
-- SERVICES (catálogo mínimo)
-- =========================================
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  base_price numeric(10,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view services"
  ON public.services FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage services"
  ON public.services FOR ALL
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- CLIENTS
-- =========================================
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  trade_name text,
  cnpj text,
  segment text,
  niche text,
  company_size text,
  logo_url text,

  contact_name text,
  contact_role text,
  phone text,
  whatsapp text,
  email text,

  website text,
  instagram text,
  facebook text,
  linkedin text,

  address text,
  city text,
  state text,

  lead_origin text,
  commercial_responsible uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'lead'
    CHECK (status IN ('lead','qualificado','proposta_enviada','negociacao','fechado','onboarding','ativo','pausado','encerrado')),
  entry_date date,

  active_contract boolean DEFAULT false,
  contract_start date,
  contract_end date,
  monthly_value numeric(10,2),
  setup_value numeric(10,2),

  young_responsible uuid REFERENCES public.young_people(id) ON DELETE SET NULL,

  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage clients"
  ON public.clients FOR ALL
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Comercial manage clients"
  ON public.clients FOR ALL
  USING (has_role(auth.uid(), 'comercial'))
  WITH CHECK (has_role(auth.uid(), 'comercial'));

CREATE POLICY "Colaborador view assigned clients"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.young_people yp
      WHERE yp.id = clients.young_responsible
        AND yp.profile_id = auth.uid()
    )
  );

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_commercial ON public.clients(commercial_responsible);

-- =========================================
-- CLIENT_SERVICES
-- =========================================
CREATE TABLE public.client_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_name text,
  status text NOT NULL DEFAULT 'ativo',
  start_date date,
  end_date date,
  monthly_value numeric(10,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client_services"
  ON public.client_services FOR ALL
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Comercial manage client_services"
  ON public.client_services FOR ALL
  USING (has_role(auth.uid(), 'comercial'))
  WITH CHECK (has_role(auth.uid(), 'comercial'));

CREATE POLICY "Colaborador view client_services of assigned"
  ON public.client_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.young_people yp ON yp.id = c.young_responsible
      WHERE c.id = client_services.client_id
        AND yp.profile_id = auth.uid()
    )
  );

CREATE INDEX idx_client_services_client ON public.client_services(client_id);

-- =========================================
-- CLIENT_BRIEFINGS
-- =========================================
CREATE TABLE public.client_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,

  company_name text,
  contact_name text,
  segment text,
  main_products text,
  target_audience text,

  main_pains text,
  biggest_challenge text,
  goals_with_mtx text,
  commercial_goals text,
  marketing_goals text,

  invests_in_marketing boolean,
  has_commercial_team boolean,
  uses_crm boolean,
  current_channels text,
  current_website text,
  social_media text,

  competitors text,
  differentials text,
  communication_tone text,

  existing_materials text,
  tools_access text,

  urgency text,
  expected_deadline text,
  estimated_budget text,
  additional_notes text,

  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can submit briefing"
  ON public.client_briefings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins manage briefings"
  ON public.client_briefings FOR ALL
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Comercial manage briefings"
  ON public.client_briefings FOR ALL
  USING (has_role(auth.uid(), 'comercial'))
  WITH CHECK (has_role(auth.uid(), 'comercial'));

CREATE INDEX idx_briefings_client ON public.client_briefings(client_id);

-- =========================================
-- CLIENT_HISTORY
-- =========================================
CREATE TABLE public.client_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage history"
  ON public.client_history FOR ALL
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Comercial manage history"
  ON public.client_history FOR ALL
  USING (has_role(auth.uid(), 'comercial'))
  WITH CHECK (has_role(auth.uid(), 'comercial'));

CREATE POLICY "Colaborador view history of assigned"
  ON public.client_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.young_people yp ON yp.id = c.young_responsible
      WHERE c.id = client_history.client_id
        AND yp.profile_id = auth.uid()
    )
  );

CREATE INDEX idx_client_history_client ON public.client_history(client_id);

-- =========================================
-- STORAGE: client-documents bucket
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins/Comercial view client documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-documents'
    AND (
      has_role(auth.uid(), 'super_admin')
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'comercial')
    )
  );

CREATE POLICY "Admins/Comercial upload client documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-documents'
    AND (
      has_role(auth.uid(), 'super_admin')
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'comercial')
    )
  );

CREATE POLICY "Admins/Comercial update client documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'client-documents'
    AND (
      has_role(auth.uid(), 'super_admin')
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'comercial')
    )
  );

CREATE POLICY "Admins/Comercial delete client documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-documents'
    AND (
      has_role(auth.uid(), 'super_admin')
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'comercial')
    )
  );
