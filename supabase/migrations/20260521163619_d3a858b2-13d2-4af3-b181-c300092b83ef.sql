
-- 1) Add media columns
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text
    CHECK (media_type IS NULL OR media_type IN ('image','video'));

ALTER TABLE public.quiz_options
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text
    CHECK (media_type IS NULL OR media_type IN ('image','video'));

-- 2) Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quiz-media', 'quiz-media', true, 52428800,
  ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif',
        'video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3) Storage policies
DROP POLICY IF EXISTS "quiz_media_public_read" ON storage.objects;
CREATE POLICY "quiz_media_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quiz-media');

DROP POLICY IF EXISTS "quiz_media_admin_insert" ON storage.objects;
CREATE POLICY "quiz_media_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'quiz-media'
    AND (has_role(auth.uid(),'admin'::app_role)
         OR has_role(auth.uid(),'super_admin'::app_role))
  );

DROP POLICY IF EXISTS "quiz_media_admin_update" ON storage.objects;
CREATE POLICY "quiz_media_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'quiz-media'
    AND (has_role(auth.uid(),'admin'::app_role)
         OR has_role(auth.uid(),'super_admin'::app_role))
  );

DROP POLICY IF EXISTS "quiz_media_admin_delete" ON storage.objects;
CREATE POLICY "quiz_media_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'quiz-media'
    AND (has_role(auth.uid(),'admin'::app_role)
         OR has_role(auth.uid(),'super_admin'::app_role))
  );

-- 4) Extend get_phase_quiz to surface media fields (additive only)
CREATE OR REPLACE FUNCTION public.get_phase_quiz(_phase_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quiz record;
  v_already_passed boolean := false;
  v_questions jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT * INTO v_quiz FROM public.quiz_templates
   WHERE phase_id = _phase_id AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.journey_quiz_attempts
     WHERE user_id = auth.uid() AND quiz_id = v_quiz.id AND passed = true
  ) INTO v_already_passed;

  SELECT COALESCE(jsonb_agg(q ORDER BY (q->>'order_index')::int), '[]'::jsonb) INTO v_questions
  FROM (
    SELECT jsonb_build_object(
      'id', qq.id,
      'question', qq.question,
      'type', qq.type,
      'order_index', qq.order_index,
      'media_url', qq.media_url,
      'media_type', qq.media_type,
      'options', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'id', qo.id, 'text', qo.text, 'order_index', qo.order_index,
          'media_url', qo.media_url, 'media_type', qo.media_type
        ) ORDER BY qo.order_index), '[]'::jsonb)
        FROM public.quiz_options qo WHERE qo.question_id = qq.id
      )
    ) AS q
    FROM public.quiz_questions qq WHERE qq.quiz_id = v_quiz.id
  ) s;

  RETURN jsonb_build_object(
    'id', v_quiz.id,
    'phase_id', v_quiz.phase_id,
    'title', v_quiz.title,
    'description', v_quiz.description,
    'passing_score', v_quiz.passing_score,
    'version', v_quiz.version,
    'already_passed', v_already_passed,
    'questions', v_questions
  );
END;
$function$;
