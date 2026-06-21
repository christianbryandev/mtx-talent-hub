-- Corrige as policies de visibilidade para jovem responsável.
-- O young_responsible_id referencia young_people.id, não auth.uid() diretamente.
-- Precisamos fazer o join via young_people.profile_id = auth.uid().

-- 1) Dropar policies incorretas
DROP POLICY IF EXISTS "Young responsible can view own opportunity_services" ON public.opportunity_services;
DROP POLICY IF EXISTS "Young responsible can view assigned opportunities" ON public.opportunities;

-- 2) Policy corrigida em opportunity_services
CREATE POLICY "Young responsible can view own opportunity_services"
ON public.opportunity_services
FOR SELECT
TO authenticated
USING (
  young_responsible_id IN (
    SELECT id FROM public.young_people WHERE profile_id = auth.uid()
  )
);

-- 3) Policy corrigida em opportunities
CREATE POLICY "Young responsible can view assigned opportunities"
ON public.opportunities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.opportunity_services os
    JOIN public.young_people yp ON yp.id = os.young_responsible_id
    WHERE os.opportunity_id = id
    AND yp.profile_id = auth.uid()
  )
);
