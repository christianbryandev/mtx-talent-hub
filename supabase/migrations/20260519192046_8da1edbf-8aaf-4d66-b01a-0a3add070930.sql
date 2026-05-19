-- 1. opportunity_services
CREATE TABLE IF NOT EXISTS public.opportunity_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(opportunity_id, service_id)
);

ALTER TABLE public.opportunity_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opportunity_services_select"
ON public.opportunity_services FOR SELECT TO authenticated
USING (true);

CREATE POLICY "opportunity_services_insert"
ON public.opportunity_services FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'comercial'::app_role)
);

CREATE POLICY "opportunity_services_delete"
ON public.opportunity_services FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'comercial'::app_role)
);

-- 2. edit_requests
CREATE TABLE IF NOT EXISTS public.edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL DEFAULT 'opportunity',
  entity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  requested_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovada', 'recusada')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  approved_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edit_requests_select"
ON public.edit_requests FOR SELECT TO authenticated
USING (
  requester_id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "edit_requests_insert"
ON public.edit_requests FOR INSERT TO authenticated
WITH CHECK (requester_id = auth.uid());

CREATE POLICY "edit_requests_update"
ON public.edit_requests FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 3. journey_phases
CREATE TABLE IF NOT EXISTS public.journey_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  young_id uuid NOT NULL REFERENCES public.young_people(id) ON DELETE CASCADE,
  phase text NOT NULL
    CHECK (phase IN ('fase_1', 'fase_2', 'fase_3', 'fase_4', 'fase_5')),
  title text NOT NULL,
  description text,
  training_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_journey_phases_updated_at ON public.journey_phases;
CREATE TRIGGER trg_journey_phases_updated_at
  BEFORE UPDATE ON public.journey_phases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.journey_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journey_phases_admin_all"
ON public.journey_phases FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "journey_phases_own"
ON public.journey_phases FOR ALL TO authenticated
USING (
  young_id IN (SELECT id FROM public.young_people WHERE profile_id = auth.uid())
)
WITH CHECK (
  young_id IN (SELECT id FROM public.young_people WHERE profile_id = auth.uid())
);

-- 4. tasks.awaiting_approval
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS awaiting_approval boolean NOT NULL DEFAULT false;

-- 5. Realtime
ALTER TABLE public.opportunity_services REPLICA IDENTITY FULL;
ALTER TABLE public.edit_requests REPLICA IDENTITY FULL;
ALTER TABLE public.journey_phases REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunity_services;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.edit_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.journey_phases;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;