CREATE OR REPLACE FUNCTION public.young_people_prevent_profile_id_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id
     AND auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Only admins can change profile_id';
  END IF;
  RETURN NEW;
END;
$function$;