-- Fix infinite recursion in RLS between clients and client_services
-- by using SECURITY DEFINER function to break the circular dependency.

-- 1. Create function that checks if user is executor of a client's service
-- executor_id references young_people.id, so we join via profile_id
CREATE OR REPLACE FUNCTION public.is_user_client_executor(client_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_services cs
    JOIN public.young_people yp ON yp.id = cs.executor_id
    WHERE cs.client_id = client_uuid
      AND yp.profile_id = user_uuid
  )
$$;

-- 2. Drop old policies on clients
DROP POLICY IF EXISTS "Comercial manage clients" ON public.clients;
DROP POLICY IF EXISTS "Comercial manage own clients" ON public.clients;
DROP POLICY IF EXISTS "Colaborador view assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Jovem view own clients" ON public.clients;

-- 3. Comercial: manage clients where captador OR executor
CREATE POLICY "Comercial manage own clients"
ON public.clients
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'comercial'::app_role)
  AND (
    commercial_responsible = auth.uid()
    OR is_user_client_executor(id, auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'comercial'::app_role)
  AND (
    commercial_responsible = auth.uid()
    OR is_user_client_executor(id, auth.uid())
  )
);

-- 4. Jovem: view clients where captador, young_responsible OR executor
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
  OR is_user_client_executor(id, auth.uid())
);

-- 5. Drop old policies on client_services
DROP POLICY IF EXISTS "Comercial manage client_services" ON public.client_services;
DROP POLICY IF EXISTS "Colaborador view client_services of assigned" ON public.client_services;
DROP POLICY IF EXISTS "Jovem aprendiz manage client_services" ON public.client_services;

-- 6. Jovem: can view own services and insert during conversion
CREATE POLICY "Jovem aprendiz view client_services"
ON public.client_services
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'jovem_aprendiz'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.young_people yp
    WHERE yp.id = client_services.executor_id
      AND yp.profile_id = auth.uid()
  )
);

CREATE POLICY "Jovem aprendiz insert client_services"
ON public.client_services
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'jovem_aprendiz'::app_role)
  OR has_role(auth.uid(), 'comercial'::app_role)
);

-- 7. Comercial: manage all client_services (gated by clients policy)
CREATE POLICY "Comercial manage client_services"
ON public.client_services
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'comercial'::app_role))
WITH CHECK (has_role(auth.uid(), 'comercial'::app_role));

-- 8. Grant execute to authenticated
REVOKE ALL ON FUNCTION public.is_user_client_executor(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_user_client_executor(uuid, uuid) TO authenticated;
