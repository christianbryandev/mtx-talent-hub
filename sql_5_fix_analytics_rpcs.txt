-- Fix analytics RPCs to pull real data from correct tables.
-- Problems fixed:
--   1. get_journey_conversion: consulted only journey_quiz_attempts, but actual quiz data
--      lives in young_quiz_attempts. Now queries BOTH tables via UNION ALL.
--   2. admin_get_journey_monitor: used legacy user_checklist_progress. Now uses user_module_progress.
--   3. admin_get_journey_tracking: same legacy table fix.
--   4. get_journey_kpis: active_users counted only 'em_andamento' status. Now also includes
--      users who have started (have any unlocked phase).

-- ============================================================
-- 1. FIX get_journey_conversion
-- ============================================================
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

  -- Users who started the journey (have any phase in progress or completed)
  SELECT COUNT(DISTINCT user_id) INTO v_started
    FROM public.user_phase_status
    WHERE status IN ('em_andamento','concluido');

  -- Users who completed the entire journey (last phase concluded)
  SELECT COUNT(DISTINCT ups.user_id) INTO v_completed
    FROM public.user_phase_status ups
    JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
    WHERE ph.order_index = v_max_order AND ups.status = 'concluido';

  -- Quiz totals: merge both quiz tables
  SELECT COUNT(*) INTO v_quiz_total FROM (
    SELECT id FROM public.journey_quiz_attempts
    UNION ALL
    SELECT id FROM public.young_quiz_attempts
  ) all_attempts;

  SELECT COUNT(*) INTO v_quiz_passed FROM (
    SELECT id FROM public.journey_quiz_attempts WHERE passed = true
    UNION ALL
    SELECT id FROM public.young_quiz_attempts WHERE passed = true
  ) passed_attempts;

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

-- ============================================================
-- 2. FIX get_journey_kpis
-- ============================================================
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

  -- Total young apprentices
  SELECT COUNT(DISTINCT ur.user_id) INTO v_total_users
    FROM public.user_roles ur WHERE ur.role = 'jovem_aprendiz';

  -- Active: users with at least one phase em_andamento OR who have module progress but didn't finish
  SELECT COUNT(DISTINCT u.user_id) INTO v_active_users
  FROM (
    SELECT user_id FROM public.user_phase_status WHERE status = 'em_andamento'
    UNION
    SELECT user_id FROM public.user_module_progress WHERE completed = true
  ) u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_phase_status ups2
    JOIN public.journey_phase_catalog ph2 ON ph2.id = ups2.phase_id
    WHERE ups2.user_id = u.user_id AND ph2.order_index = v_max_order AND ups2.status = 'concluido'
  );

  -- Completed: users who finished the last phase
  SELECT COUNT(*) INTO v_completed_users
  FROM (
    SELECT ups.user_id
    FROM public.user_phase_status ups
    JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
    WHERE ph.order_index = v_max_order AND ups.status = 'concluido'
  ) s;

  -- Average XP across all users who have XP
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

-- ============================================================
-- 3. FIX admin_get_journey_monitor (migrate from checklist to modules)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_journey_monitor()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_max_order int;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT MAX(order_index) INTO v_max_order FROM public.journey_phase_catalog;

  WITH base_users AS (
    SELECT DISTINCT p.id AS user_id, p.full_name, p.email
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'jovem_aprendiz'
  ),
  totals AS (
    SELECT bu.user_id,
      (SELECT COALESCE(SUM(xp_amount),0) FROM public.xp_events WHERE user_id = bu.user_id)::int AS total_xp,
      (SELECT COUNT(*) FROM public.journey_modules)::int AS total_items,
      (SELECT COUNT(*) FROM public.user_module_progress ump
        JOIN public.journey_modules jm ON jm.id = ump.module_id
        WHERE ump.user_id = bu.user_id AND ump.completed = true)::int AS done_items,
      (SELECT MAX(ump.completed_at) FROM public.user_module_progress ump
        WHERE ump.user_id = bu.user_id AND ump.completed = true) AS last_item_at
    FROM base_users bu
  ),
  quiz_stats AS (
    SELECT bu.user_id,
      -- Merge both quiz tables
      (SELECT COUNT(*) FROM (
        SELECT id FROM public.journey_quiz_attempts WHERE user_id = bu.user_id
        UNION ALL
        SELECT id FROM public.young_quiz_attempts WHERE young_id = bu.user_id
      ) a)::int AS total_attempts,
      (SELECT COUNT(DISTINCT phase_ref) FROM (
        SELECT phase_id::text AS phase_ref FROM public.journey_quiz_attempts WHERE user_id = bu.user_id
        UNION
        SELECT phase AS phase_ref FROM public.young_quiz_attempts WHERE young_id = bu.user_id
      ) q)::int AS quizzes_taken,
      (SELECT COUNT(*) FROM (
        SELECT id FROM public.journey_quiz_attempts WHERE user_id = bu.user_id AND passed = true
        UNION ALL
        SELECT id FROM public.young_quiz_attempts WHERE young_id = bu.user_id AND passed = true
      ) p)::int AS quizzes_passed,
      -- Last score: most recent from either table
      (SELECT score FROM (
        SELECT score, created_at FROM public.journey_quiz_attempts WHERE user_id = bu.user_id
        UNION ALL
        SELECT score, created_at FROM public.young_quiz_attempts WHERE young_id = bu.user_id
      ) ls ORDER BY created_at DESC LIMIT 1) AS last_score,
      -- Best score: max from either table
      (SELECT MAX(score) FROM (
        SELECT score FROM public.journey_quiz_attempts WHERE user_id = bu.user_id
        UNION ALL
        SELECT score FROM public.young_quiz_attempts WHERE young_id = bu.user_id
      ) bs) AS best_score,
      -- Last attempt date
      (SELECT MAX(created_at) FROM (
        SELECT created_at FROM public.journey_quiz_attempts WHERE user_id = bu.user_id
        UNION ALL
        SELECT created_at FROM public.young_quiz_attempts WHERE young_id = bu.user_id
      ) la) AS last_attempt_at,
      -- Last attempt passed
      (SELECT passed FROM (
        SELECT passed, created_at FROM public.journey_quiz_attempts WHERE user_id = bu.user_id
        UNION ALL
        SELECT passed, created_at FROM public.young_quiz_attempts WHERE young_id = bu.user_id
      ) lp ORDER BY created_at DESC LIMIT 1) AS last_attempt_passed
    FROM base_users bu
  ),
  current_phase AS (
    SELECT bu.user_id,
      (SELECT ph.title FROM public.user_phase_status ups
        JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
        WHERE ups.user_id = bu.user_id AND ups.status = 'em_andamento'
        ORDER BY ph.order_index ASC LIMIT 1) AS in_progress_title,
      (SELECT ph.title FROM public.user_phase_status ups
        JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
        WHERE ups.user_id = bu.user_id AND ups.status = 'concluido'
        ORDER BY ph.order_index DESC LIMIT 1) AS last_done_title,
      (SELECT COUNT(*) FROM public.user_phase_status ups
        JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
        WHERE ups.user_id = bu.user_id AND ph.order_index = v_max_order AND ups.status = 'concluido') AS journey_done_count,
      (SELECT MIN(unlocked_at) FROM public.user_phase_status WHERE user_id = bu.user_id) AS started_at,
      (SELECT MAX(unlocked_at) FROM public.user_phase_status WHERE user_id = bu.user_id AND status = 'em_andamento') AS in_progress_since
    FROM base_users bu
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', bu.user_id,
    'name', COALESCE(NULLIF(bu.full_name,''), bu.email, 'Sem nome'),
    'email', COALESCE(bu.email, ''),
    'total_xp', t.total_xp,
    'current_phase', COALESCE(cp.in_progress_title, cp.last_done_title, 'Não iniciada'),
    'progress_percentage', CASE WHEN t.total_items > 0
                                THEN ROUND((t.done_items::numeric / t.total_items::numeric) * 100)::int
                                ELSE 0 END,
    'quizzes_taken', q.quizzes_taken,
    'quizzes_passed', q.quizzes_passed,
    'total_attempts', q.total_attempts,
    'last_score', q.last_score,
    'best_score', q.best_score,
    'last_attempt_passed', q.last_attempt_passed,
    'last_activity', GREATEST(
      COALESCE(t.last_item_at, 'epoch'::timestamptz),
      COALESCE(q.last_attempt_at, 'epoch'::timestamptz),
      COALESCE(cp.in_progress_since, 'epoch'::timestamptz)
    ),
    'started_at', cp.started_at,
    'status', CASE
                WHEN cp.journey_done_count > 0 THEN 'Concluído'
                WHEN cp.started_at IS NULL THEN 'Não iniciada'
                WHEN q.last_attempt_passed IS FALSE THEN 'Reprovado'
                WHEN cp.in_progress_since IS NOT NULL
                     AND cp.in_progress_since < now() - INTERVAL '14 days'
                     AND t.done_items = 0 THEN 'Travado'
                ELSE 'Em andamento'
              END
  ) ORDER BY t.total_xp DESC), '[]'::jsonb)
  INTO v_result
  FROM base_users bu
  JOIN totals t ON t.user_id = bu.user_id
  JOIN quiz_stats q ON q.user_id = bu.user_id
  JOIN current_phase cp ON cp.user_id = bu.user_id;

  RETURN v_result;
END;
$function$;

-- ============================================================
-- 4. FIX admin_get_journey_tracking (migrate from checklist to modules)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_journey_tracking()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_max_order int;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT MAX(order_index) INTO v_max_order FROM public.journey_phase_catalog;

  WITH base_users AS (
    SELECT DISTINCT p.id AS user_id, p.full_name, p.email
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'jovem_aprendiz'
  ),
  totals AS (
    SELECT bu.user_id,
      (SELECT COALESCE(SUM(xp_amount),0) FROM public.xp_events
        WHERE user_id = bu.user_id)::int AS total_xp,
      (SELECT COUNT(*) FROM public.journey_modules)::int AS total_items,
      (SELECT COUNT(*) FROM public.user_module_progress ump
        JOIN public.journey_modules jm ON jm.id = ump.module_id
        WHERE ump.user_id = bu.user_id AND ump.completed = true)::int AS done_items
    FROM base_users bu
  ),
  current_phase AS (
    SELECT bu.user_id,
      (
        SELECT ph.title FROM public.user_phase_status ups
        JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
        WHERE ups.user_id = bu.user_id AND ups.status = 'em_andamento'
        ORDER BY ph.order_index ASC LIMIT 1
      ) AS in_progress_title,
      (
        SELECT ph.title FROM public.user_phase_status ups
        JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
        WHERE ups.user_id = bu.user_id AND ups.status = 'concluido'
        ORDER BY ph.order_index DESC LIMIT 1
      ) AS last_done_title,
      (
        SELECT COUNT(*) FROM public.user_phase_status ups
        JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
        WHERE ups.user_id = bu.user_id AND ph.order_index = v_max_order AND ups.status = 'concluido'
      ) AS journey_done_count,
      (
        SELECT MAX(ups.unlocked_at) FROM public.user_phase_status ups
        WHERE ups.user_id = bu.user_id AND ups.status = 'em_andamento'
      ) AS in_progress_since,
      -- Last quiz passed from both tables
      (
        SELECT passed FROM (
          SELECT passed, created_at FROM public.journey_quiz_attempts WHERE user_id = bu.user_id
          UNION ALL
          SELECT passed, created_at FROM public.young_quiz_attempts WHERE young_id = bu.user_id
        ) combined ORDER BY created_at DESC LIMIT 1
      ) AS last_attempt_passed
    FROM base_users bu
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', bu.user_id,
    'name', COALESCE(NULLIF(bu.full_name,''), bu.email, 'Sem nome'),
    'email', COALESCE(bu.email, ''),
    'total_xp', t.total_xp,
    'current_phase', COALESCE(cp.in_progress_title, cp.last_done_title, 'Não iniciada'),
    'progress_percentage', CASE WHEN t.total_items > 0
                                THEN ROUND((t.done_items::numeric / t.total_items::numeric) * 100)::int
                                ELSE 0 END,
    'status', CASE
                WHEN cp.journey_done_count > 0 THEN 'Concluído'
                WHEN cp.last_attempt_passed IS FALSE THEN 'Travado'
                WHEN cp.in_progress_since IS NOT NULL
                     AND cp.in_progress_since < now() - INTERVAL '14 days'
                     AND t.done_items = 0 THEN 'Travado'
                ELSE 'Em dia'
              END
  ) ORDER BY t.total_xp DESC), '[]'::jsonb)
  INTO v_result
  FROM base_users bu
  JOIN totals t ON t.user_id = bu.user_id
  JOIN current_phase cp ON cp.user_id = bu.user_id;

  RETURN v_result;
END;
$function$;
