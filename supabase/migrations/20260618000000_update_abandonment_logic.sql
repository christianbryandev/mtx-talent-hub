-- Update get_journey_conversion with new abandonment logic
CREATE OR REPLACE FUNCTION public.get_journey_conversion()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started int;
  v_completed int;
  v_quiz_total int;
  v_quiz_passed int;
  v_max_order int;
  v_dropoff numeric;
  v_pass_rate numeric;
  v_total_jovens int;
  v_abandoned int;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT MAX(order_index) INTO v_max_order FROM public.journey_phase_catalog;

  -- Started: real jovens with phase in progress or completed
  SELECT COUNT(DISTINCT ups.user_id) INTO v_started
    FROM public.user_phase_status ups
    JOIN public.profiles p ON p.id = ups.user_id
    JOIN public.user_roles ur ON ur.user_id = ups.user_id AND ur.role = 'jovem_aprendiz'
    WHERE ups.status IN ('em_andamento','concluido')
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur2
        WHERE ur2.user_id = ups.user_id AND ur2.role IN ('admin', 'super_admin')
      );

  -- Completed: real jovens who finished last phase
  SELECT COUNT(DISTINCT ups.user_id) INTO v_completed
    FROM public.user_phase_status ups
    JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
    JOIN public.profiles p ON p.id = ups.user_id
    JOIN public.user_roles ur ON ur.user_id = ups.user_id AND ur.role = 'jovem_aprendiz'
    WHERE ph.order_index = v_max_order AND ups.status = 'concluido'
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur2
        WHERE ur2.user_id = ups.user_id AND ur2.role IN ('admin', 'super_admin')
      );

  -- Total Jovens
  SELECT COUNT(p.id) INTO v_total_jovens
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'jovem_aprendiz'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = p.id AND ur2.role IN ('admin', 'super_admin')
    );

  -- Abandoned: Jovens who have NOT completed the journey AND have NO activity in the last 7 days
  SELECT COUNT(p.id) INTO v_abandoned
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'jovem_aprendiz'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = p.id AND ur2.role IN ('admin', 'super_admin')
    )
    AND NOT EXISTS (
      -- NOT completed the final phase
      SELECT 1 FROM public.user_phase_status ups
      JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
      WHERE ups.user_id = p.id AND ph.order_index = v_max_order AND ups.status = 'concluido'
    )
    AND (
      COALESCE(
        (SELECT MAX(COALESCE(ups.completed_at, ups.unlocked_at, p.created_at)) FROM public.user_phase_status ups WHERE ups.user_id = p.id),
        p.created_at
      ) < NOW() - INTERVAL '7 days'
    );

  -- Quiz totals: only from real jovens, both tables
  SELECT COUNT(*) INTO v_quiz_total FROM (
    SELECT jqa.id FROM public.journey_quiz_attempts jqa
      JOIN public.profiles p ON p.id = jqa.user_id
      JOIN public.user_roles ur ON ur.user_id = jqa.user_id AND ur.role = 'jovem_aprendiz'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.user_roles ur2
        WHERE ur2.user_id = jqa.user_id AND ur2.role IN ('admin', 'super_admin')
      )
    UNION ALL
    SELECT yqa.id FROM public.young_quiz_attempts yqa
      JOIN public.profiles p ON p.id = yqa.young_id
      JOIN public.user_roles ur ON ur.user_id = yqa.young_id AND ur.role = 'jovem_aprendiz'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.user_roles ur2
        WHERE ur2.user_id = yqa.young_id AND ur2.role IN ('admin', 'super_admin')
      )
  ) all_attempts;

  SELECT COUNT(*) INTO v_quiz_passed FROM (
    SELECT jqa.id FROM public.journey_quiz_attempts jqa
      JOIN public.profiles p ON p.id = jqa.user_id
      JOIN public.user_roles ur ON ur.user_id = jqa.user_id AND ur.role = 'jovem_aprendiz'
      WHERE jqa.passed = true
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles ur2
          WHERE ur2.user_id = jqa.user_id AND ur2.role IN ('admin', 'super_admin')
        )
    UNION ALL
    SELECT yqa.id FROM public.young_quiz_attempts yqa
      JOIN public.profiles p ON p.id = yqa.young_id
      JOIN public.user_roles ur ON ur.user_id = yqa.young_id AND ur.role = 'jovem_aprendiz'
      WHERE yqa.passed = true
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles ur2
          WHERE ur2.user_id = yqa.young_id AND ur2.role IN ('admin', 'super_admin')
        )
  ) passed_attempts;

  v_dropoff := CASE WHEN v_total_jovens > 0
                    THEN ROUND((v_abandoned::numeric / v_total_jovens::numeric) * 100, 1)
                    ELSE 0 END;

  v_pass_rate := CASE WHEN v_quiz_total > 0
                      THEN ROUND((v_quiz_passed::numeric / v_quiz_total::numeric) * 100, 1)
                      ELSE 0 END;

  RETURN jsonb_build_object(
    'total_started', COALESCE(v_started, 0),
    'total_completed', COALESCE(v_completed, 0),
    'dropoff_rate', v_dropoff,
    'quiz_pass_rate', v_pass_rate,
    'quiz_attempts_total', COALESCE(v_quiz_total, 0),
    'quiz_attempts_passed', COALESCE(v_quiz_passed, 0)
  );
END;
$$;
