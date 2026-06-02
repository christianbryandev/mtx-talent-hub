-- Grant table privileges on young_applications so the public inscription form can insert,
-- and admins (via RLS policies) can read/manage. RLS policies already exist; only GRANTs were missing.

GRANT INSERT ON public.young_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.young_applications TO authenticated;
GRANT ALL ON public.young_applications TO service_role;