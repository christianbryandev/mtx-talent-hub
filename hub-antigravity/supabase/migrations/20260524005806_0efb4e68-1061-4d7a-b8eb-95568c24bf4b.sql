
-- 1) Fix: Quiz correct answers readable by all authenticated users
-- Drop overly permissive SELECT policy on quiz_options. Players consume quizzes
-- via the SECURITY DEFINER function `get_phase_quiz` (which omits is_correct),
-- and admins go through `admin_get_quiz_options`. Direct SELECT is not needed.
DROP POLICY IF EXISTS quiz_options_read ON public.quiz_options;

-- 2) Fix: avatars bucket has no SELECT policy
-- Avatars bucket is public; add an explicit RLS SELECT policy for transparency
-- and to gate API-level reads/listing to the public avatars bucket only.
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- 3) Fix: Realtime postgres_changes wildcard open to all authenticated users
-- Restrict realtime.messages SELECT to user's own topic only (remove the
-- broad postgres_changes% wildcard). Postgres Changes broadcasts are still
-- gated by table-level RLS on the underlying tables when used via the
-- supabase-js postgres_changes subscriptions through the publication.
DROP POLICY IF EXISTS "Users access own topic" ON realtime.messages;
CREATE POLICY "Users access own topic"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (realtime.topic() = ('user:' || (auth.uid())::text));
