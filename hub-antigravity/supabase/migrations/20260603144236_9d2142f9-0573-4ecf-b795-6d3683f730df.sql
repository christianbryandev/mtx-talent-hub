DROP POLICY IF EXISTS "Admins can view all answers" ON public.quiz_answers;

CREATE POLICY "Admins can view all answers"
  ON public.quiz_answers
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );