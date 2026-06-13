-- Explicitly grant permissions
GRANT ALL ON TABLE public.young_applications TO anon;
GRANT ALL ON TABLE public.young_applications TO authenticated;
GRANT ALL ON TABLE public.young_applications TO service_role;
GRANT ALL ON TABLE public.young_applications TO postgres;

-- Re-apply RLS policies with clear names
DROP POLICY IF EXISTS "Anon can submit application" ON public.young_applications;
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.young_applications;

CREATE POLICY "Allow public submission" ON public.young_applications
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow admins to view everything" ON public.young_applications
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Allow admins to update" ON public.young_applications
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);
