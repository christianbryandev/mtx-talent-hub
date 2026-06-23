-- Update the SELECT policy for client_briefings to allow any authenticated user
-- to view a briefing if they have permission to view the corresponding client.
-- This ensures Jovem Aprendiz and other roles can see briefings for their clients.

DROP POLICY IF EXISTS "View briefings" ON public.client_briefings;

CREATE POLICY "View briefings"
ON public.client_briefings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'comercial'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_briefings.client_id
  )
);
