-- Update get_journey_kpis to count as active only users who have started a module
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

  -- Active: users with at least one record in user_module_progress (started something)
  -- but have not completed the entire journey
  SELECT COUNT(DISTINCT u.user_id) INTO v_active_users
  FROM (
    SELECT user_id FROM public.user_module_progress
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

-- Update get_journey_phase_distribution so that:
-- 'em_andamento' = user is in this phase AND has module progress for this phase
-- 'nao_iniciada' = user is in this phase BUT has NO module progress for this phase
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
      
      -- Nao Iniciada = user is currently in this phase, but has no module progress for this phase
      COUNT(DISTINCT ups.user_id) FILTER (
        WHERE (
          (COALESCE(ups.status,'pendente') = 'pendente' AND COALESCE(ups.unlocked,false) = true)
          OR ups.status = 'em_andamento'
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.user_module_progress ump
          JOIN public.journey_modules jm ON jm.id = ump.module_id
          WHERE ump.user_id = ups.user_id AND jm.phase_id = ph.id
        )
      )::int AS nao_iniciada,

      -- Em Andamento = user is currently in this phase, AND has module progress for this phase
      COUNT(DISTINCT ups.user_id) FILTER (
        WHERE (
          (COALESCE(ups.status,'pendente') = 'pendente' AND COALESCE(ups.unlocked,false) = true)
          OR ups.status = 'em_andamento'
        )
        AND EXISTS (
          SELECT 1 FROM public.user_module_progress ump
          JOIN public.journey_modules jm ON jm.id = ump.module_id
          WHERE ump.user_id = ups.user_id AND jm.phase_id = ph.id
        )
      )::int AS em_andamento,

      -- Concluida
      COUNT(DISTINCT ups.user_id) FILTER (WHERE ups.status = 'concluido')::int AS concluida,
      
      -- Bloqueada
      COUNT(DISTINCT ups.user_id) FILTER (WHERE COALESCE(ups.unlocked,false) = false AND COALESCE(ups.status,'pendente') = 'pendente')::int AS bloqueada,

      -- total_users = only users whose CURRENT phase is this one
      COUNT(DISTINCT ups.user_id) FILTER (
        WHERE (COALESCE(ups.status,'pendente') = 'pendente' AND COALESCE(ups.unlocked,false) = true)
           OR ups.status = 'em_andamento'
      )::int AS total_users

    FROM public.journey_phase_catalog ph
    LEFT JOIN public.user_phase_status ups ON ups.phase_id = ph.id
      AND EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = ups.user_id
      )
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = ups.user_id AND ur.role = 'jovem_aprendiz'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur2
        WHERE ur2.user_id = ups.user_id AND ur2.role IN ('admin', 'super_admin')
      )
    GROUP BY ph.id, ph.title, ph.order_index
  ) s;

  RETURN v_result;
END;
$$;
