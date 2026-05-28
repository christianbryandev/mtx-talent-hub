CREATE OR REPLACE FUNCTION public.get_user_journey(_user_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_total_xp int;
  v_total_items int;
  v_done_items int;
BEGIN
  -- Security check
  IF _user_id IS NULL OR (_user_id <> auth.uid()
     AND NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Ensure first phase is unlocked for the user
  INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at)
  SELECT _user_id, id, 'pendente', true, now()
    FROM public.journey_phase_catalog
   WHERE order_index = (SELECT MIN(order_index) FROM public.journey_phase_catalog)
  ON CONFLICT DO NOTHING;

  -- Build the JSON result
  SELECT jsonb_build_object(
    'phases', COALESCE(jsonb_agg(p ORDER BY (p->>'order_index')::int), '[]'::jsonb)
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', ph.id,
      'title', ph.title,
      'description', ph.description,
      'order_index', ph.order_index,
      'has_quiz', ph.has_quiz,
      'xp_reward', ph.xp_reward,
      'unlocked', COALESCE(ups.unlocked, false),
      'raw_status', COALESCE(ups.status, 'pendente'),
      'status', (
        CASE
          WHEN COALESCE(ups.unlocked, false) = false THEN 'bloqueada'
          WHEN COALESCE(ups.status,'pendente') = 'concluido' THEN 'concluida'
          WHEN (
            -- Phase is done if all its modules are done
            SELECT COUNT(*) FROM public.journey_modules WHERE phase_id = ph.id
          ) > 0 AND (
            SELECT COUNT(*) FROM public.journey_modules m
            LEFT JOIN public.user_module_progress ump ON ump.module_id = m.id AND ump.user_id = _user_id
            WHERE m.phase_id = ph.id AND COALESCE(ump.completed, false) = true
          ) = (SELECT COUNT(*) FROM public.journey_modules WHERE phase_id = ph.id)
          THEN 'concluida'
          ELSE COALESCE(ups.status, 'em_andamento')
        END
      ),
      'cards_total', (SELECT COUNT(*) FROM public.journey_modules WHERE phase_id = ph.id),
      'cards_done', (SELECT COUNT(*) FROM public.user_module_progress ump 
                     JOIN public.journey_modules m ON m.id = ump.module_id
                     WHERE ump.user_id = _user_id AND m.phase_id = ph.id AND ump.completed = true),
      'last_quiz_score', (SELECT score FROM public.journey_quiz_attempts
                           WHERE user_id = _user_id AND phase_id = ph.id
                           ORDER BY created_at DESC LIMIT 1),
      'modules', (
        SELECT COALESCE(jsonb_agg(m ORDER BY (m->>'order_index')::int), '[]'::jsonb)
        FROM (
          SELECT jsonb_build_object(
            'id', jm.id,
            'title', jm.title,
            'description', jm.description,
            'content_type', jm.content_type,
            'content_body', jm.content_body,
            'duration_minutes', jm.duration_minutes,
            'order_index', jm.order_index,
            'completed', COALESCE(ump.completed, false),
            'thumbnail_url', jm.thumbnail_url,
            'unlocked', (
              -- First module of first phase is always unlocked
              -- Other modules are unlocked if previous is completed
              CASE 
                WHEN jm.order_index = 1 AND ph.order_index = (SELECT MIN(order_index) FROM public.journey_phase_catalog) THEN true
                WHEN jm.order_index = 1 THEN COALESCE(ups.unlocked, false)
                ELSE EXISTS (
                  SELECT 1 FROM public.journey_modules prev
                  LEFT JOIN public.user_module_progress p_ump ON p_ump.module_id = prev.id AND p_ump.user_id = _user_id
                  WHERE prev.phase_id = ph.id AND prev.order_index = jm.order_index - 1 AND COALESCE(p_ump.completed, false) = true
                )
              END
            )
          ) AS m
          FROM public.journey_modules jm
          LEFT JOIN public.user_module_progress ump ON ump.module_id = jm.id AND ump.user_id = _user_id
          WHERE jm.phase_id = ph.id
        ) sub
      )
    ) AS p
    FROM public.journey_phase_catalog ph
    LEFT JOIN public.user_phase_status ups ON ups.phase_id = ph.id AND ups.user_id = _user_id
  ) phases;

  -- Global stats
  SELECT COALESCE(SUM(xp_amount),0) INTO v_total_xp FROM public.xp_events WHERE user_id = _user_id;
  
  -- Use modules for progress counts
  SELECT COUNT(*) INTO v_total_items FROM public.journey_modules;
  SELECT COUNT(*) INTO v_done_items FROM public.user_module_progress WHERE user_id = _user_id AND completed = true;

  RETURN v_result || jsonb_build_object(
    'total_items', v_total_items,
    'done_items', v_done_items,
    'total_xp', v_total_xp,
    'overall_progress', CASE WHEN v_total_items > 0
                             THEN ROUND((v_done_items::numeric / v_total_items::numeric) * 100)::int
                             ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;