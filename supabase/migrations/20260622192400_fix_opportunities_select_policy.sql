-- Update the SELECT policy for opportunities to allow all internal roles (super_admin, admin, comercial, jovem_aprendiz)
-- to view all opportunities. This prevents RLS violations when a Jovem Aprendiz or Comercial user reassigns
-- an opportunity to another user (which changes the commercial_responsible and would otherwise make the row invisible to them,
-- causing PostgreSQL's UPDATE ... RETURNING check to fail).

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
    AND user_roles.role IN ('admin', 'super_admin', 'comercial', 'jovem_aprendiz')
  )
);
