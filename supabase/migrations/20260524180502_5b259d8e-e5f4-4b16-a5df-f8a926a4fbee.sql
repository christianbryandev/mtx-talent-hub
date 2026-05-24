
-- 1) invites: remove public SELECT, expose via SECURITY DEFINER functions
DROP POLICY IF EXISTS "Anyone can view an invite by token" ON public.invites;
DROP POLICY IF EXISTS "Update invite as used" ON public.invites;

CREATE OR REPLACE FUNCTION public.get_invite_by_token_public(_token uuid)
RETURNS TABLE (id uuid, token uuid, application_id uuid, email text, is_used boolean, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, token, application_id, email, is_used, created_at
  FROM public.invites
  WHERE token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.mark_invite_used(_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.invites
     SET is_used = true
   WHERE token = _token AND is_used = false;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.get_invite_by_token_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token_public(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_invite_used(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_invite_used(uuid) TO anon, authenticated;

-- 2) notificacoes-anexos: make private; restrict SELECT to admins or notification recipient
UPDATE storage.buckets SET public = false WHERE id = 'notificacoes-anexos';

DROP POLICY IF EXISTS "Public Access for notifications attachments" ON storage.objects;

CREATE POLICY "Notification attachments readable by admins or recipient"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'notificacoes-anexos'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = auth.uid()
        AND n.attachment_url LIKE '%' || storage.objects.name
    )
  )
);

-- 3) quiz-media: explicit public read policy (intentional)
CREATE POLICY "Quiz media public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'quiz-media');

-- 4) chat_membros: restrict viewing to channels the user belongs to
DROP POLICY IF EXISTS "Users can view memberships" ON public.chat_membros;

CREATE POLICY "Users can view members of their channels"
ON public.chat_membros FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_membros m
    WHERE m.canal_id = chat_membros.canal_id
      AND m.perfil_id = auth.uid()
  )
);
