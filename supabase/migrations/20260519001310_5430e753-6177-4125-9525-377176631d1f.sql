
CREATE TABLE public.user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role public.app_role NOT NULL,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_invites_token ON public.user_invites(token);
CREATE INDEX idx_user_invites_email ON public.user_invites(email);

ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Super admin total access
CREATE POLICY "super_admin manage invites"
ON public.user_invites
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Public read by token (anyone, used by /convite/:token page).
-- The token itself is opaque/random; without it nothing is exposed.
CREATE POLICY "public read invite by token"
ON public.user_invites
FOR SELECT
TO anon, authenticated
USING (true);
