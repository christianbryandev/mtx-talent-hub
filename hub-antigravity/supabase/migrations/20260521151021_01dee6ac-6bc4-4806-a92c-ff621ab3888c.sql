
-- KPIs gerais da jornada
CREATE OR REPLACE FUNCTION public.get_journey_kpis()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_users int;
  v_active_users int;
  v_completed_users int;
  v_avg_xp numeric;
  v_max_order int;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT MAX(order_index) INTO v_max_order FROM public.journey_phase_catalog;

  SELECT COUNT(DISTINCT ur.user_id) INTO v_total_users
    FROM public.user_roles ur WHERE ur.role = 'colaborador';

  SELECT COUNT(DISTINCT ups.user_id) INTO v_active_users
    FROM public.user_phase_status ups
    WHERE ups.status = 'em_andamento';

  SELECT COUNT(*) INTO v_completed_users
  FROM (
    SELECT ups.user_id
    FROM public.user_phase_status ups
    JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
    WHERE ph.order_index = v_max_order AND ups.status = 'concluido'
  ) s;

  SELECT COALESCE(AVG(total_xp), 0) INTO v_avg_xp FROM (
    SELECT user_id, SUM(xp_amount)::numeric AS total_xp
    FROM public.xp_events GROUP BY user_id
  ) t;

  RETURN jsonb_build_object(
    'total_users', COALESCE(v_total_users, 0),
    'active_users', COALESCE(v_active_users, 0),
    'completed_users', COALESCE(v_completed_users, 0),
    'avg_xp', ROUND(COALESCE(v_avg_xp, 0), 1)
  );
END;
$$;

-- Distribuição de usuários por fase e status
CREATE OR REPLACE FUNCTION public.get_journey_phase_distribution()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.order_index), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      ph.id AS phase_id,
      ph.title AS phase_name,
      ph.order_index,
      COUNT(*) FILTER (WHERE COALESCE(ups.status,'pendente') = 'pendente' AND COALESCE(ups.unlocked,false) = true)::int AS nao_iniciada,
      COUNT(*) FILTER (WHERE ups.status = 'em_andamento')::int AS em_andamento,
      COUNT(*) FILTER (WHERE ups.status = 'concluido')::int AS concluida,
      COUNT(*) FILTER (WHERE COALESCE(ups.unlocked,false) = false)::int AS bloqueada,
      COUNT(DISTINCT ups.user_id)::int AS total_users
    FROM public.journey_phase_catalog ph
    LEFT JOIN public.user_phase_status ups ON ups.phase_id = ph.id
    GROUP BY ph.id, ph.title, ph.order_index
  ) s;

  RETURN v_result;
END;
$$;

-- Conversão e taxa de aprovação de quizzes
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
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT MAX(order_index) INTO v_max_order FROM public.journey_phase_catalog;

  SELECT COUNT(DISTINCT user_id) INTO v_started
    FROM public.user_phase_status
    WHERE status IN ('em_andamento','concluido');

  SELECT COUNT(DISTINCT ups.user_id) INTO v_completed
    FROM public.user_phase_status ups
    JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
    WHERE ph.order_index = v_max_order AND ups.status = 'concluido';

  SELECT COUNT(*) INTO v_quiz_total FROM public.journey_quiz_attempts;
  SELECT COUNT(*) INTO v_quiz_passed FROM public.journey_quiz_attempts WHERE passed = true;

  v_dropoff := CASE WHEN v_started > 0
                    THEN ROUND(((v_started - v_completed)::numeric / v_started::numeric) * 100, 1)
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
