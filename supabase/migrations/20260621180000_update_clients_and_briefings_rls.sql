-- Update clients visibility: jovem sees client if captador, young_responsible, or executor
DROP POLICY IF EXISTS "Colaborador view assigned clients" ON public.clients;

CREATE POLICY "Jovem view own clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  commercial_responsible = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.young_people yp
    WHERE yp.id = clients.young_responsible
      AND yp.profile_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.client_services cs
    JOIN public.young_people yp ON yp.id = cs.executor_id
    WHERE cs.client_id = clients.id
      AND yp.profile_id = auth.uid()
  )
);

-- Update briefing visibility: captador, comercial, super_admin, and client owner
DROP POLICY IF EXISTS "Cliente view own briefings" ON public.client_briefings;

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
      AND c.commercial_responsible = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_briefings.client_id
      AND c.profile_id = auth.uid()
  )
);
