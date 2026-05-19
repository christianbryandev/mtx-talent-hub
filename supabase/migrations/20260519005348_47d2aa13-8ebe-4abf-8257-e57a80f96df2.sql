-- 1) user_invites: stop public SELECT, expose only via SECURITY DEFINER RPC
DROP POLICY IF EXISTS "public read invite by token" ON public.user_invites;

CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE (
  email text,
  full_name text,
  role app_role,
  expires_at timestamptz,
  used boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email, full_name, role, expires_at, used
  FROM public.user_invites
  WHERE token = _token
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_invite_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;

-- 2) Storage: avatars - public bucket URLs continue working without a SELECT policy.
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;

-- 3) Storage: task-attachments - restrict SELECT to owners, admins, comercial,
-- or the young responsible for the related task.
DROP POLICY IF EXISTS "Authenticated read task attachments" ON storage.objects;

CREATE POLICY "Task attachments scoped read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND (
    auth.uid() = owner
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'comercial'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.task_attachments ta
      JOIN public.tasks t ON t.id = ta.task_id
      JOIN public.young_people yp ON yp.id = t.young_responsible
      WHERE ta.file_url LIKE '%' || storage.objects.name
        AND yp.profile_id = auth.uid()
    )
  )
);

-- 4) Revoke EXECUTE on internal SECURITY DEFINER helpers (trigger/cron only).
REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_roles(app_role[], text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.daily_notifications_job() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_opportunity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_opportunity_won() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_meeting_participant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_application() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_briefing_submitted() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_task_status_changed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_task_assigned() FROM PUBLIC, anon, authenticated;

-- 5) Tighten always-true INSERT policies.
DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Public can submit briefing" ON public.client_briefings;
CREATE POLICY "Anon can submit briefing"
ON public.client_briefings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  company_name IS NOT NULL
  AND contact_name IS NOT NULL
  AND client_id IS NULL
);

DROP POLICY IF EXISTS "Anyone can submit application" ON public.young_applications;
CREATE POLICY "Anon can submit application"
ON public.young_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (full_name IS NOT NULL);

-- 6) Realtime: restrict channel subscriptions so users can only join their own topic.
DO $outer$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users access own topic" ON realtime.messages';
    EXECUTE $p$
      CREATE POLICY "Users access own topic"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (
        (realtime.topic() = ('user:' || auth.uid()::text))
        OR (realtime.topic() LIKE 'postgres_changes%')
      )
    $p$;
  END IF;
END
$outer$;
