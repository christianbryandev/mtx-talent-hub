-- Fix: assigned_users stores young_people.id but query used profiles.id (auth.uid())
-- Resolve the young_people.id from the user's profile_id before checking assigned_users

CREATE OR REPLACE FUNCTION public.get_user_journey(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_total_xp int;
  v_total_items int;
  v_done_items int;
  v_young_id uuid;
BEGIN
  -- Security check
  IF _user_id IS NULL OR (_user_id <> auth.uid()
     AND NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Resolve young_people.id from profile_id (for assigned_users matching)
  SELECT id INTO v_young_id FROM public.young_people WHERE profile_id = _user_id LIMIT 1;

  -- Ensure first phase is unlocked for the user
  INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at)
  SELECT _user_id, id, 'pendente', true, now()
    FROM public.journey_phase_catalog
   WHERE order_index = (SELECT MIN(order_index) FROM public.journey_phase_catalog)
  ON CONFLICT DO NOTHING;

  SELECT jsonb_build_object(
    'phases', COALESCE(jsonb_agg(p ORDER BY (p->>'order_index')::int), '[]'::jsonb)
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', ph.id,
      'title', ph.title,
      'description', ph.description,
      'order_index', ph.order_index,
      'xp_reward', ph.xp_reward,
      'status', COALESCE(ups.status, 'pendente'),
      'unlocked', COALESCE(ups.unlocked, false),
      'modules', COALESCE((
        SELECT jsonb_agg(sub.m ORDER BY (sub.m->>'order_index')::int)
        FROM (
          SELECT jsonb_build_object(
            'id', jm.id,
            'title', jm.title,
            'description', jm.description,
            'content_type', jm.content_type,
            'content_body', jm.content_body,
            'supplementary_text', jm.supplementary_text,
            'thumbnail_url', jm.thumbnail_url,
            'order_index', jm.order_index,
            'phase_id', jm.phase_id,
            'quiz_id', jm.quiz_id,
            'visibility_type', jm.visibility_type,
            'assigned_users', COALESCE(to_jsonb(jm.assigned_users), '[]'::jsonb),
            'completed', COALESCE(ump.completed, false),
            'completed_at', ump.completed_at,
            'unlocked', (
              -- first module in phase always unlocked if phase is unlocked
              jm.order_index = (SELECT MIN(order_index) FROM public.journey_modules WHERE phase_id = ph.id)
              OR
              -- previous module completed
              EXISTS (
                SELECT 1
                FROM public.journey_modules prev
                LEFT JOIN public.user_module_progress p_ump ON p_ump.module_id = prev.id AND p_ump.user_id = _user_id
                WHERE prev.phase_id = jm.phase_id
                  AND prev.order_index < jm.order_index
                  AND NOT EXISTS (
                    SELECT 1 FROM public.journey_modules btwn
                    WHERE btwn.phase_id = jm.phase_id
                      AND btwn.order_index > prev.order_index
                      AND btwn.order_index < jm.order_index
                  )
                  AND COALESCE(p_ump.completed, false) = true
              )
              OR
              -- phase unlocked from previous phase completion
              EXISTS (
                SELECT 1 FROM public.user_module_progress pmp
                JOIN public.journey_modules pm ON pm.id = pmp.module_id
                     WHERE pmp.user_id = _user_id AND pm.phase_id = ph.id AND pmp.completed = true)
            ),
            'phase_completed', EXISTS (
                          SELECT 1 FROM public.user_phase_status
                           WHERE user_id = _user_id AND phase_id = ph.id
                             AND status = 'concluido'
            ),
            'checklist', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'id', i.id,
                'label', i.title,
                'order_index', i.order_index,
                'done', COALESCE(ui.completed, false)
              ) ORDER BY i.order_index)
              FROM public.journey_checklist_items i
              LEFT JOIN public.user_checklist_progress ui ON ui.checklist_item_id = i.id AND ui.user_id = _user_id
              WHERE i.module_id = jm.id
            ), '[]'::jsonb)
          ) as m
          FROM public.journey_modules jm
          LEFT JOIN public.user_module_progress ump ON ump.module_id = jm.id AND ump.user_id = _user_id
          WHERE jm.phase_id = ph.id
            AND (
              jm.visibility_type = 'all'
              OR (jm.visibility_type = 'admin_only' AND (has_role(_user_id, 'admin') OR has_role(_user_id, 'super_admin')))
              OR (jm.visibility_type = 'selected' AND (v_young_id = ANY(jm.assigned_users) OR _user_id = ANY(jm.assigned_users)))
            )
        ) sub
      ), '[]'::jsonb)
    ) as p
    FROM public.journey_phase_catalog ph
    LEFT JOIN public.user_phase_status ups ON ups.phase_id = ph.id AND ups.user_id = _user_id
  ) phases_sub;

  -- Update aggregate KPIs
  SELECT COUNT(*) INTO v_total_items FROM public.journey_modules;
  SELECT COUNT(*) INTO v_done_items FROM public.user_module_progress WHERE user_id = _user_id AND completed = true;
  SELECT COALESCE(SUM(xp_reward), 0) INTO v_total_xp
    FROM public.journey_phase_catalog ph
    JOIN public.user_phase_status ups ON ups.phase_id = ph.id
   WHERE ups.user_id = _user_id AND ups.status = 'concluido';

  RETURN jsonb_build_object(
    'phases', v_result->'phases',
    'kpis', jsonb_build_object(
      'total_xp', v_total_xp,
      'total_items', v_total_items,
      'done_items', v_done_items
    )
  );
END;
$function$;
