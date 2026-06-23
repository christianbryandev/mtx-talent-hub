-- Restrict all write operations (INSERT, UPDATE, DELETE) on the services table
-- to only super_admin users. Other authenticated users can only read services.

DROP POLICY IF EXISTS "Admins manage services" ON public.services;

CREATE POLICY "Super Admins manage services"
ON public.services
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
