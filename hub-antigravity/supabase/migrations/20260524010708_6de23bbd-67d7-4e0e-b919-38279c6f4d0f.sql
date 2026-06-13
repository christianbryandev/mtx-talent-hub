
-- Drop the view (it triggered the Security Definer View linter)
DROP VIEW IF EXISTS public.young_people_safe;

-- Replace with a SECURITY DEFINER function that explicitly checks the caller's role
CREATE OR REPLACE FUNCTION public.get_young_people_safe()
RETURNS TABLE (
  id uuid,
  full_name text,
  photo_url text,
  age integer,
  phone text,
  whatsapp text,
  email text,
  city text,
  state text,
  education_level text,
  school text,
  current_situation text,
  dreams text,
  skills text,
  interest_area text,
  vocation_area text,
  status text,
  trail_phase text,
  entry_date date,
  mentor_id uuid,
  availability text,
  has_laptop boolean,
  has_phone boolean,
  has_internet boolean,
  has_professional_chip boolean,
  has_cnpj boolean,
  observations text,
  profile_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  last_progress_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    yp.id, yp.full_name, yp.photo_url, yp.age, yp.phone, yp.whatsapp, yp.email,
    yp.city, yp.state, yp.education_level, yp.school, yp.current_situation,
    yp.dreams, yp.skills, yp.interest_area, yp.vocation_area, yp.status,
    yp.trail_phase, yp.entry_date, yp.mentor_id, yp.availability,
    yp.has_laptop, yp.has_phone, yp.has_internet, yp.has_professional_chip,
    yp.has_cnpj, yp.observations, yp.profile_id, yp.created_at, yp.updated_at,
    yp.last_progress_at
  FROM public.young_people yp
  WHERE
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'comercial'::public.app_role)
    OR yp.profile_id = auth.uid()
  ORDER BY yp.full_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_young_people_safe() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_young_people_safe() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_young_people_safe() TO authenticated;
