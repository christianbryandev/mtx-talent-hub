
-- 1. young_people: drop overly broad authenticated policies
DROP POLICY IF EXISTS "Allow authenticated select on young_people" ON public.young_people;
DROP POLICY IF EXISTS "Allow authenticated insert on young_people" ON public.young_people;
DROP POLICY IF EXISTS "Allow authenticated update on young_people" ON public.young_people;

-- Prevent self-service profile_id reassignment (only admins can change profile_id)
CREATE OR REPLACE FUNCTION public.young_people_prevent_profile_id_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Only admins can change profile_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS young_people_protect_profile_id ON public.young_people;
CREATE TRIGGER young_people_protect_profile_id
BEFORE UPDATE ON public.young_people
FOR EACH ROW EXECUTE FUNCTION public.young_people_prevent_profile_id_change();

-- Scoped UPDATE for owner already exists ("Colaboradores update own young record")
-- Add WITH CHECK to existing self-update by recreating it
DROP POLICY IF EXISTS "Colaboradores update own young record" ON public.young_people;
CREATE POLICY "Colaboradores update own young record"
ON public.young_people
FOR UPDATE
TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Comercial role should also be able to view young_people (business need)
CREATE POLICY "Comercial view young_people"
ON public.young_people
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'comercial'));

-- 2. user_achievements: drop ALL self-policy, replace with self-SELECT only + admin manage
DROP POLICY IF EXISTS "uach_self" ON public.user_achievements;

CREATE POLICY "Users view own achievements"
ON public.user_achievements
FOR SELECT
TO authenticated
USING (user_id = auth.uid()
       OR public.has_role(auth.uid(), 'admin')
       OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage achievements"
ON public.user_achievements
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 3. xp_events: drop self insert; only admins can insert directly (SECURITY DEFINER functions like process_xp_event still work because they run as definer)
DROP POLICY IF EXISTS "xp_self_insert" ON public.xp_events;

CREATE POLICY "Admins insert xp events"
ON public.xp_events
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
