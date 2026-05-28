-- Grant permissions to public roles for applications
GRANT INSERT, SELECT ON public.young_applications TO anon;
GRANT INSERT, SELECT ON public.young_applications TO authenticated;
GRANT ALL ON public.young_applications TO service_role;

-- Ensure RLS is enabled
ALTER TABLE public.young_applications ENABLE ROW LEVEL SECURITY;

-- Policy for anyone to submit an application
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'young_applications' 
        AND policyname = 'Anyone can submit applications'
    ) THEN
        CREATE POLICY "Anyone can submit applications" ON public.young_applications
        FOR INSERT TO anon, authenticated
        WITH CHECK (true);
    END IF;
END $$;

-- Policy for admins to view and manage all applications
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'young_applications' 
        AND policyname = 'Admins can view and manage applications'
    ) THEN
        CREATE POLICY "Admins can view and manage applications" ON public.young_applications
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid()
                AND role IN ('super_admin', 'admin')
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid()
                AND role IN ('super_admin', 'admin')
            )
        );
    END IF;
END $$;
