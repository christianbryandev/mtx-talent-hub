CREATE OR REPLACE FUNCTION public.can_access_chat()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'comercial', 'jovem_aprendiz')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_chat() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_chat() TO authenticated;

REVOKE ALL ON FUNCTION public.get_catalog_phases() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_catalog_phases() TO authenticated;

REVOKE ALL ON FUNCTION public.get_journey_ranking() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_journey_ranking() TO authenticated;

REVOKE ALL ON FUNCTION public.increment_module_indices(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_module_indices(uuid, integer) TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_member_chat_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_achievement_chat_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_phase_completion_chat_message() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Anyone can submit an application" ON public.applications;
CREATE POLICY "Public can submit new applications safely"
ON public.applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND length(trim(name)) BETWEEN 3 AND 120
  AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND (
    phone IS NULL
    OR length(regexp_replace(phone, '\\D', '', 'g')) BETWEEN 10 AND 15
  )
);

DROP POLICY IF EXISTS "Allow public submission" ON public.young_applications;
DROP POLICY IF EXISTS "Admins manage applications" ON public.young_applications;
CREATE POLICY "Public can submit young applications safely"
ON public.young_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pendente'
  AND length(trim(full_name)) BETWEEN 3 AND 150
  AND (
    email IS NULL
    OR email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  )
  AND (
    phone IS NULL
    OR length(regexp_replace(phone, '\\D', '', 'g')) BETWEEN 10 AND 15
  )
  AND (
    whatsapp IS NULL
    OR length(regexp_replace(whatsapp, '\\D', '', 'g')) BETWEEN 10 AND 15
  )
  AND coalesce(data_authorization, false) = true
  AND (
    birth_date IS NULL
    OR age IS NULL
    OR age = date_part('year', age(current_date, birth_date))::integer
  )
);

CREATE POLICY "Admins manage young applications"
ON public.young_applications
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "upload de avatar proprio" ON storage.objects;