-- Fix quiz_answers INSERT policy to correctly join through young_people
DROP POLICY IF EXISTS "Users can insert their own answers" ON public.quiz_answers;

CREATE POLICY "Users can insert their own answers"
  ON public.quiz_answers
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.young_quiz_attempts qa
      JOIN public.young_people yp ON yp.id = qa.young_id
      WHERE qa.id = quiz_answers.attempt_id
        AND yp.profile_id = auth.uid()
    )
  );

-- Add chat-assets INSERT policy for chat participants
DROP POLICY IF EXISTS "Chat participants can upload chat assets" ON storage.objects;

CREATE POLICY "Chat participants can upload chat assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-assets'
    AND can_access_chat()
  );

-- Revoke PUBLIC EXECUTE on all SECURITY DEFINER functions in public schema
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosecdef = true
      AND n.nspname = 'public'
  LOOP
    BEGIN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC;',
        fn.proname,
        COALESCE(fn.args, '')
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not revoke %: %', fn.proname, SQLERRM;
    END;
  END LOOP;
END $$;

-- Grant EXECUTE on user-facing functions to authenticated (with correct signatures)
DO $$
BEGIN
  BEGIN GRANT EXECUTE ON FUNCTION public.can_access_chat() TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip can_access_chat: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip has_role: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.get_catalog_phases() TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip get_catalog_phases: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.get_journey_ranking() TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip get_journey_ranking: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.get_user_journey(uuid) TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip get_user_journey: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.submit_phase_quiz(uuid, jsonb) TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip submit_phase_quiz: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.get_phase_quiz(uuid) TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip get_phase_quiz: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.start_user_journey() TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip start_user_journey: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.toggle_checklist_item(uuid, uuid, boolean) TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip toggle_checklist_item: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.update_phase_checklist(uuid, jsonb) TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip update_phase_checklist: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.update_phase_fields(uuid, jsonb) TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip update_phase_fields: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.process_xp_event(uuid, text, uuid, integer) TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip process_xp_event: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.get_primary_role(uuid) TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip get_primary_role: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip get_invite_by_token: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.mark_invite_used(uuid) TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip mark_invite_used: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.activate_client_service(uuid) TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip activate_client_service: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.get_young_people_safe() TO authenticated; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip get_young_people_safe: %', SQLERRM; END;
END $$;

-- Grant EXECUTE on public-facing functions to anon (for unauthenticated flows)
DO $$
BEGIN
  BEGIN GRANT EXECUTE ON FUNCTION public.get_catalog_phases() TO anon; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip get_catalog_phases anon: %', SQLERRM; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.get_invite_by_token_public(uuid) TO anon; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip get_invite_by_token_public: %', SQLERRM; END;
END $$;

-- Grant EXECUTE on all SECURITY DEFINER functions to service_role
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosecdef = true
      AND n.nspname = 'public'
  LOOP
    BEGIN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role;',
        fn.proname,
        COALESCE(fn.args, '')
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not grant %: %', fn.proname, SQLERRM;
    END;
  END LOOP;
END $$;