-- Opportunities
CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text,
  phone text,
  whatsapp text,
  email text,
  niche text,
  company_size text,
  main_pain text,
  suggested_solution text,
  offered_service text,
  estimated_value numeric(10,2),
  closing_probability integer CHECK (closing_probability BETWEEN 0 AND 100),
  funnel_stage text NOT NULL DEFAULT 'prospeccao' CHECK (funnel_stage IN (
    'icp_definido','segmentacao','prospeccao','contato_realizado','follow_up',
    'qualificacao','diagnostico','proposta_enviada','negociacao','fechamento','onboarding'
  )),
  commercial_responsible uuid,
  lead_origin text,
  priority text NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa','media','alta')),
  last_contact_date date,
  next_followup_date date,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','ganha','perdida')),
  loss_reason text,
  converted_client_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage opportunities" ON public.opportunities FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Comercial manage opportunities" ON public.opportunities FOR ALL
  USING (has_role(auth.uid(), 'comercial'::app_role))
  WITH CHECK (has_role(auth.uid(), 'comercial'::app_role));

CREATE TRIGGER opportunities_updated_at BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_opportunities_funnel_stage ON public.opportunities(funnel_stage);
CREATE INDEX idx_opportunities_status ON public.opportunities(status);
CREATE INDEX idx_opportunities_responsible ON public.opportunities(commercial_responsible);

-- Interactions
CREATE TABLE public.opportunity_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  recorded_by uuid,
  type text,
  description text,
  next_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunity_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage interactions" ON public.opportunity_interactions FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Comercial manage interactions" ON public.opportunity_interactions FOR ALL
  USING (has_role(auth.uid(), 'comercial'::app_role))
  WITH CHECK (has_role(auth.uid(), 'comercial'::app_role));

CREATE INDEX idx_interactions_opportunity ON public.opportunity_interactions(opportunity_id);

-- Proposals
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  client_id uuid,
  title text,
  value numeric(10,2),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','enviada','aceita','recusada')),
  sent_at timestamptz,
  responded_at timestamptz,
  notes text,
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage proposals" ON public.proposals FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Comercial manage proposals" ON public.proposals FOR ALL
  USING (has_role(auth.uid(), 'comercial'::app_role))
  WITH CHECK (has_role(auth.uid(), 'comercial'::app_role));

CREATE INDEX idx_proposals_opportunity ON public.proposals(opportunity_id);