-- Grant jovem_aprendiz access to services table (read-only) for CRM auto-calculations
-- This allows the ServiceMultiSelect component to load service prices

-- Update services SELECT policy to include jovem_aprendiz
DROP POLICY IF EXISTS "Roles allowed to view services" ON public.services;
CREATE POLICY "Roles allowed to view services"
ON public.services
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'comercial'::app_role) OR
  has_role(auth.uid(), 'jovem_aprendiz'::app_role)
);

-- Grant jovem_aprendiz INSERT/DELETE on opportunity_services for their own opportunities
CREATE POLICY "Jovem aprendiz manage own opportunity_services"
ON public.opportunity_services
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'jovem_aprendiz'::app_role)
  AND opportunity_id IN (
    SELECT id FROM public.opportunities WHERE commercial_responsible = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'jovem_aprendiz'::app_role)
  AND opportunity_id IN (
    SELECT id FROM public.opportunities WHERE commercial_responsible = auth.uid()
  )
);
