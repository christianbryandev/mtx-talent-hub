-- Liberar leitura de serviços para todos os usuários autenticados.
-- Serviços são um catálogo público interno.

DROP POLICY IF EXISTS "Roles allowed to view services" ON public.services;

CREATE POLICY "Authenticated view services"
ON public.services
FOR SELECT
TO authenticated
USING (true);
