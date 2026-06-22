-- Fix "Jovem aprendiz manage own opportunities" policy to allow young apprentices to assign commercial_responsible to others.
-- The USING clause restricts them to targeting their own opportunities (commercial_responsible = auth.uid()),
-- while the WITH CHECK clause is relaxed so they can update the responsible to someone else.

DROP POLICY IF EXISTS "Jovem aprendiz manage own opportunities" ON public.opportunities;

CREATE POLICY "Jovem aprendiz manage own opportunities"
ON public.opportunities
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'jovem_aprendiz'::app_role)
  AND commercial_responsible = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'jovem_aprendiz'::app_role)
);
