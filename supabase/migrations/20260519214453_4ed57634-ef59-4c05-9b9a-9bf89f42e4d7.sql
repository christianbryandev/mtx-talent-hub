
-- Tabela de atribuição múltipla de jovens a cards de jornada
CREATE TABLE IF NOT EXISTS public.journey_phase_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES public.journey_phases(id) ON DELETE CASCADE,
  young_id uuid NOT NULL REFERENCES public.young_people(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phase_id, young_id)
);

CREATE INDEX IF NOT EXISTS idx_jpa_phase ON public.journey_phase_assignees(phase_id);
CREATE INDEX IF NOT EXISTS idx_jpa_young ON public.journey_phase_assignees(young_id);

ALTER TABLE public.journey_phase_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jpa_admin_all"
  ON public.journey_phase_assignees FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "jpa_self_view"
  ON public.journey_phase_assignees FOR SELECT
  TO authenticated
  USING (young_id IN (SELECT id FROM public.young_people WHERE profile_id = auth.uid()));

-- Atualiza visibilidade de journey_phases para incluir jovens co-atribuídos
DROP POLICY IF EXISTS "journey_phases_own" ON public.journey_phases;

CREATE POLICY "journey_phases_own"
  ON public.journey_phases FOR ALL
  TO authenticated
  USING (
    young_id IN (SELECT id FROM public.young_people WHERE profile_id = auth.uid())
    OR id IN (
      SELECT phase_id FROM public.journey_phase_assignees
      WHERE young_id IN (SELECT id FROM public.young_people WHERE profile_id = auth.uid())
    )
  )
  WITH CHECK (
    young_id IN (SELECT id FROM public.young_people WHERE profile_id = auth.uid())
    OR id IN (
      SELECT phase_id FROM public.journey_phase_assignees
      WHERE young_id IN (SELECT id FROM public.young_people WHERE profile_id = auth.uid())
    )
  );
