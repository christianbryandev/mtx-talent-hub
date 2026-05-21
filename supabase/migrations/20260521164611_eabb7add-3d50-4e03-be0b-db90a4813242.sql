
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
    WHERE ur.role = 'colaborador'
  ),
  totals AS (
    SELECT bu.user_id,
      (SELECT COALESCE(SUM(xp_amount),0) FROM public.xp_events WHERE user_id = bu.user_id)::int AS total_xp,
      (SELECT COUNT(*) FROM public.journey_checklist_items WHERE required = true)::int AS total_items,
      (SELECT COUNT(*) FROM public.user_checklist_progress ucp
         JOIN public.journey_checklist_items ci ON ci.id = ucp.checklist_item_id
        WHERE ucp.user_id = bu.user_id AND ci.required = true)::int AS done_items,
      (SELECT MAX(completed_at) FROM public.user_checklist_progress WHERE user_id = bu.user_id) AS last_item_at
    FROM base_users bu
  ),
  quiz_stats AS (
    SELECT bu.user_id,
      (SELECT COUNT(*) FROM public.journey_quiz_attempts WHERE user_id = bu.user_id)::int AS total_attempts,
      (SELECT COUNT(DISTINCT phase_id) FROM public.journey_quiz_attempts WHERE user_id = bu.user_id)::int AS quizzes_taken,
      (SELECT COUNT(*) FROM public.journey_quiz_attempts WHERE user_id = bu.user_id AND passed = true)::int AS quizzes_passed,
      (SELECT score FROM public.journey_quiz_attempts WHERE user_id = bu.user_id ORDER BY created_at DESC LIMIT 1) AS last_score,
      (SELECT MAX(score) FROM public.journey_quiz_attempts WHERE user_id = bu.user_id) AS best_score,
      (SELECT MAX(created_at) FROM public.journey_quiz_attempts WHERE user_id = bu.user_id) AS last_attempt_at,
      (SELECT passed FROM public.journey_quiz_attempts WHERE user_id = bu.user_id ORDER BY created_at DESC LIMIT 1) AS last_attempt_passed
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

GRANT EXECUTE ON FUNCTION public.admin_get_journey_monitor() TO authenticated;
