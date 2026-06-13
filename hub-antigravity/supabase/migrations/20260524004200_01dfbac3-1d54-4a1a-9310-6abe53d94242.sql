-- ============================================
-- FIX 1: Quiz answers exposure
-- ============================================
-- Revoke direct column access to is_correct from regular users.
-- Admins will read it via a SECURITY DEFINER RPC.

REVOKE SELECT (is_correct) ON public.quiz_options FROM anon, authenticated;

-- Secure function for admins to fetch quiz options with the correct flag.
CREATE OR REPLACE FUNCTION public.admin_get_quiz_options(p_question_id uuid)
RETURNS TABLE (
  id uuid,
  question_id uuid,
  text text,
  is_correct boolean,
  order_index integer,
  media_url text,
  media_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT qo.id, qo.question_id, qo.text, qo.is_correct, qo.order_index, qo.media_url, qo.media_type
  FROM public.quiz_options qo
  WHERE qo.question_id = p_question_id
  ORDER BY qo.order_index;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_quiz_options(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_quiz_options(uuid) TO authenticated;

-- ============================================
-- FIX 2: Storage upload — task-attachments
-- ============================================
DROP POLICY IF EXISTS "Authenticated upload task attachments" ON storage.objects;

CREATE POLICY "Authenticated upload task attachments scoped"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments'
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'comercial'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.young_people yp ON yp.id = t.young_responsible
      WHERE yp.profile_id = auth.uid()
    )
  )
);
