-- Grant jovem_aprendiz CRM access: manage own opportunities and clients

-- 1) Opportunities: jovem_aprendiz can manage their own (commercial_responsible = auth.uid())
CREATE POLICY "Jovem aprendiz manage own opportunities"
ON public.opportunities
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'jovem_aprendiz'::app_role)
  AND commercial_responsible = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'jovem_aprendiz'::app_role)
  AND commercial_responsible = auth.uid()
);

-- 2) Clients: jovem_aprendiz can manage their own (commercial_responsible = auth.uid())
CREATE POLICY "Jovem aprendiz manage own clients"
ON public.clients
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'jovem_aprendiz'::app_role)
  AND commercial_responsible = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'jovem_aprendiz'::app_role)
  AND commercial_responsible = auth.uid()
);

-- 3) Opportunity interactions: jovem_aprendiz can manage interactions on their own opportunities
CREATE POLICY "Jovem aprendiz manage own interactions"
ON public.opportunity_interactions
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'jovem_aprendiz'::app_role)
  AND opportunity_id IN (
    SELECT id FROM public.opportunities WHERE commercial_responsible = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'jovem_aprendiz'::app_role)
  AND opportunity_id IN (
    SELECT id FROM public.opportunities WHERE commercial_responsible = auth.uid()
  )
);
