-- Update the SELECT policy for opportunities.
-- Admin, super_admin e comercial veem todas as oportunidades.
-- Jovem aprendiz NÃO está incluído aqui — seu acesso é controlado pelas policies:
--   "Jovem aprendiz manage own opportunities" (commercial_responsible = auth.uid())
--   "Young responsible can view assigned opportunities" (young_responsible_id via opportunity_services)

DROP POLICY IF EXISTS "Enable read for admin or assigned commercial" ON public.opportunities;

CREATE POLICY "Enable read for admin or assigned commercial"
ON public.opportunities
FOR SELECT
TO authenticated
USING (
  (auth.uid() = commercial_responsible) OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin', 'comercial')
  )
);
