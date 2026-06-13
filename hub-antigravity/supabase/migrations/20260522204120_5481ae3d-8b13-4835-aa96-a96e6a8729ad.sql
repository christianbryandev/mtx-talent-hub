-- 1. Revoke default execution from public/anon
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- 2. Secure process_xp_event (simple but critical)
CREATE OR REPLACE FUNCTION public.process_xp_event(
  _user_id uuid, _event_type text, _reference_id uuid, _xp_amount integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Authorization check
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))) THEN
     RAISE EXCEPTION 'unauthorized';
  END IF;

  INSERT INTO public.xp_events (user_id, event_type, reference_id, xp_amount)
  VALUES (_user_id, _event_type, _reference_id, _xp_amount)
  ON CONFLICT (user_id, event_type, reference_id) DO NOTHING;
  RETURN FOUND;
END;
$$;

-- 3. Grant back to authenticated for necessary app functions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_primary_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.start_user_journey() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_journey(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_checklist_item(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_phase_quiz(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_phase_fields(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_phase_checklist(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_phase_quiz(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_system_event(uuid, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_system_event(uuid, text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_xp_event(uuid, text, uuid, integer) TO authenticated;

-- Admin/Special functions (still restricted by internal role checks or logic)
GRANT EXECUTE ON FUNCTION public.get_journey_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_journey_phase_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_journey_conversion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_journey_demo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_journey_tracking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_journey_monitor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_client_service(uuid) TO authenticated;

-- 4. Set search_path for all SECURITY DEFINER functions to prevent hijacking
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION public.get_primary_role(uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.notify_admins(text, text, text, text, uuid) SET search_path = public;
ALTER FUNCTION public.get_invite_by_token(text) SET search_path = public;
ALTER FUNCTION public.update_phase_fields(uuid, jsonb) SET search_path = public;
ALTER FUNCTION public.update_phase_checklist(uuid, jsonb) SET search_path = public;
ALTER FUNCTION public.submit_phase_quiz(uuid, jsonb) SET search_path = public;
ALTER FUNCTION public.log_system_event(uuid, text, text, text, text, jsonb) SET search_path = public;
ALTER FUNCTION public.record_system_event(uuid, text, text, uuid, jsonb) SET search_path = public;
ALTER FUNCTION public.get_journey_kpis() SET search_path = public;
ALTER FUNCTION public.get_journey_phase_distribution() SET search_path = public;
ALTER FUNCTION public.get_journey_conversion() SET search_path = public;
ALTER FUNCTION public.seed_journey_demo() SET search_path = public;
ALTER FUNCTION public.get_phase_quiz(uuid) SET search_path = public;
ALTER FUNCTION public.start_user_journey() SET search_path = public;
ALTER FUNCTION public.admin_get_journey_monitor() SET search_path = public;
ALTER FUNCTION public.toggle_checklist_item(uuid, uuid, boolean) SET search_path = public;
ALTER FUNCTION public.admin_get_journey_tracking() SET search_path = public;
ALTER FUNCTION public.notify_roles(app_role[], text, text, text, text, uuid) SET search_path = public;
ALTER FUNCTION public.notify_task_assigned() SET search_path = public;
ALTER FUNCTION public.notify_task_status_changed() SET search_path = public;
ALTER FUNCTION public.notify_new_application() SET search_path = public;
ALTER FUNCTION public.notify_briefing_submitted() SET search_path = public;
ALTER FUNCTION public.notify_new_opportunity() SET search_path = public;
ALTER FUNCTION public.notify_opportunity_won() SET search_path = public;
ALTER FUNCTION public.notify_meeting_participant() SET search_path = public;
ALTER FUNCTION public.daily_notifications_job() SET search_path = public;
ALTER FUNCTION public.young_people_before_save() SET search_path = public;
ALTER FUNCTION public.young_people_prevent_profile_id_change() SET search_path = public;
ALTER FUNCTION public.activate_client_service(uuid) SET search_path = public;

-- 5. Storage Security: Remove broad listing from public buckets
DROP POLICY IF EXISTS "ver avatars publicamente" ON storage.objects;
DROP POLICY IF EXISTS "quiz_media_public_read" ON storage.objects;
DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects; -- Check for other common names
