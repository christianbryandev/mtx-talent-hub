-- Allow jovem_aprendiz to manage client_services for clients they created
CREATE POLICY "Jovem aprendiz manage client_services"
ON public.client_services
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'jovem_aprendiz'::app_role)
  AND client_id IN (
    SELECT id FROM public.clients WHERE commercial_responsible = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'jovem_aprendiz'::app_role)
  AND client_id IN (
    SELECT id FROM public.clients WHERE commercial_responsible = auth.uid()
  )
);
