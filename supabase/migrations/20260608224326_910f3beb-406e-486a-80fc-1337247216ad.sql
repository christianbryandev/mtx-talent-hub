-- Create a public view exposing only non-sensitive service columns
CREATE OR REPLACE VIEW public.services_public AS
SELECT
  id,
  name,
  description,
  category,
  scope,
  deliverables,
  average_deadline,
  status,
  is_active
FROM public.services;

-- Allow all authenticated users to read the public view
GRANT SELECT ON public.services_public TO authenticated;
GRANT ALL ON public.services_public TO service_role;

-- Remove the overly permissive policy that exposed all columns to every authenticated user
DROP POLICY IF EXISTS "Authenticated view services" ON public.services;

-- Restrict full services table reads to admin and commercial roles only
CREATE POLICY "Roles allowed to view services"
ON public.services
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'comercial'::app_role)
);

-- Remove unused tables from the realtime publication to reduce broadcast attack surface
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'opportunity_services'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.opportunity_services;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'edit_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.edit_requests;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'journey_phases'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.journey_phases;
    END IF;
END $$;