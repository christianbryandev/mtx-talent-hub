-- Fix: policy "Jovem view own clients" was missing has_role check,
-- allowing any authenticated user to see clients where they are executor.
-- Add has_role guard so only jovem_aprendiz users use this policy.

DROP POLICY IF EXISTS "Jovem view own clients" ON public.clients;

CREATE POLICY "Jovem view own clients"
ON public.clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'jovem_aprendiz'::app_role)
  AND (
    commercial_responsible = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.young_people yp
      WHERE yp.id = clients.young_responsible
        AND yp.profile_id = auth.uid()
    )
    OR is_user_client_executor(id, auth.uid())
  )
);
