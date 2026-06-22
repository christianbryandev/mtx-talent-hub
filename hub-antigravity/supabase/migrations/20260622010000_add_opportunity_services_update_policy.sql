-- Fix: allow comercial/admin/super_admin to UPDATE opportunity_services
-- This enables saving young_responsible_id during opportunity management
CREATE POLICY "opportunity_services_update"
ON public.opportunity_services
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'comercial'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'comercial'::app_role)
);
