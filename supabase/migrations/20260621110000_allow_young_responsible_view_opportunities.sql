-- Permite que jovens atribuídos como responsável de um serviço vejam o opportunity_service
CREATE POLICY "Young responsible can view own opportunity_services"
ON public.opportunity_services
FOR SELECT
TO authenticated
USING (
  young_responsible_id = auth.uid()
);

-- Permite que jovens atribuídos como responsável de um serviço vejam a oportunidade
CREATE POLICY "Young responsible can view assigned opportunities"
ON public.opportunities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.opportunity_services os
    WHERE os.opportunity_id = id
    AND os.young_responsible_id = auth.uid()
  )
);
