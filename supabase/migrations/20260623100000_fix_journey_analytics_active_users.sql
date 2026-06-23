-- =========================================================================
-- READEQUAÇÃO DAS FUNÇÕES RPC DE ANALYTICS (Analytics Jornada)
-- Filtragem estrita por jovens ativos (ignora desligados, reprovados e admins)
-- e correção do total_users por fase para ignorar quem está pendente.
-- =========================================================================

-- A. get_journey_kpis
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
  -- Validar permissão
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT MAX(order_index) INTO v_max_order FROM public.journey_phase_catalog;

  -- Total de jovens reais cadastrados na jornada (jovem_aprendiz, não admin, status ativo)
  SELECT COUNT(DISTINCT yp.profile_id) INTO v_total_users
    FROM public.young_people yp
    JOIN public.user_roles ur ON ur.user_id = yp.profile_id AND ur.role = 'jovem_aprendiz'
    WHERE yp.profile_id IS NOT NULL
      AND yp.status NOT IN ('desligado', 'reprovado', 'cancelada')
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur2
        WHERE ur2.user_id = yp.profile_id AND ur2.role IN ('admin', 'super_admin')
      );

  -- Em andamento: jovens ativos com alguma fase em_andamento ou progresso de módulos
  SELECT COUNT(DISTINCT u.user_id) INTO v_active_users
  FROM (
    SELECT user_id FROM public.user_phase_status WHERE status = 'em_andamento'
    UNION
    SELECT user_id FROM public.user_module_progress WHERE completed = true
  ) u
  WHERE EXISTS (
    SELECT 1 FROM public.young_people yp
    JOIN public.user_roles ur ON ur.user_id = yp.profile_id AND ur.role = 'jovem_aprendiz'
    WHERE yp.profile_id = u.user_id
      AND yp.status NOT IN ('desligado', 'reprovado', 'cancelada')
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur2
        WHERE ur2.user_id = yp.profile_id AND ur2.role IN ('admin', 'super_admin')
      )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_phase_status ups2
    JOIN public.journey_phase_catalog ph2 ON ph2.id = ups2.phase_id
    WHERE ups2.user_id = u.user_id AND ph2.order_index = v_max_order AND ups2.status = 'concluido'
  );

  -- Concluídos: jovens ativos que concluíram a última fase
  SELECT COUNT(*) INTO v_completed_users
  FROM (
    SELECT ups.user_id
    FROM public.user_phase_status ups
    JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
    WHERE ph.order_index = v_max_order AND ups.status = 'concluido'
      AND EXISTS (
        SELECT 1 FROM public.young_people yp
        JOIN public.user_roles ur ON ur.user_id = yp.profile_id AND ur.role = 'jovem_aprendiz'
        WHERE yp.profile_id = ups.user_id
          AND yp.status NOT IN ('desligado', 'reprovado', 'cancelada')
          AND NOT EXISTS (
            SELECT 1 FROM public.user_roles ur2
            WHERE ur2.user_id = yp.profile_id AND ur2.role IN ('admin', 'super_admin')
          )
      )
  ) s;

  -- Média de XP para jovens ativos reais
  SELECT COALESCE(AVG(total_xp), 0) INTO v_avg_xp FROM (
    SELECT user_id, SUM(xp_amount)::numeric AS total_xp
    FROM public.xp_events 
    WHERE EXISTS (
      SELECT 1 FROM public.young_people yp
      JOIN public.user_roles ur ON ur.user_id = yp.profile_id AND ur.role = 'jovem_aprendiz'
      WHERE yp.profile_id = user_id
        AND yp.status NOT IN ('desligado', 'reprovado', 'cancelada')
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles ur2
          WHERE ur2.user_id = yp.profile_id AND ur2.role IN ('admin', 'super_admin')
        )
    )
    GROUP BY user_id
  ) t;

  RETURN jsonb_build_object(
    'total_users', COALESCE(v_total_users, 0),
    'active_users', COALESCE(v_active_users, 0),
    'completed_users', COALESCE(v_completed_users, 0),
    'avg_xp', ROUND(COALESCE(v_avg_xp, 0), 1)
  );
END;
$$;


-- B. get_journey_phase_distribution
CREATE OR REPLACE FUNCTION public.get_journey_phase_distribution()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Validar permissão
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
      -- total_users representa apenas quem de fato iniciou ou concluiu a fase (ignora quem está com status pendente)
      COUNT(DISTINCT ups.user_id) FILTER (
        WHERE ups.status IN ('em_andamento', 'concluido')
      )::int AS total_users
    FROM public.journey_phase_catalog ph
    LEFT JOIN public.user_phase_status ups ON ups.phase_id = ph.id
      AND EXISTS (
        SELECT 1 FROM public.young_people yp
        JOIN public.user_roles ur ON ur.user_id = yp.profile_id AND ur.role = 'jovem_aprendiz'
        WHERE yp.profile_id = ups.user_id
          AND yp.status NOT IN ('desligado', 'reprovado', 'cancelada')
          AND NOT EXISTS (
            SELECT 1 FROM public.user_roles ur2
            WHERE ur2.user_id = yp.profile_id AND ur2.role IN ('admin', 'super_admin')
          )
      )
    GROUP BY ph.id, ph.title, ph.order_index
  ) s;

  RETURN v_result;
END;
$$;


-- C. get_journey_conversion
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
  -- Validar permissão
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT MAX(order_index) INTO v_max_order FROM public.journey_phase_catalog;

  -- Iniciaram: jovens ativos reais que têm alguma fase em_andamento ou concluído
  SELECT COUNT(DISTINCT ups.user_id) INTO v_started
    FROM public.user_phase_status ups
    WHERE ups.status IN ('em_andamento','concluido')
      AND EXISTS (
        SELECT 1 FROM public.young_people yp
        JOIN public.user_roles ur ON ur.user_id = yp.profile_id AND ur.role = 'jovem_aprendiz'
        WHERE yp.profile_id = ups.user_id
          AND yp.status NOT IN ('desligado', 'reprovado', 'cancelada')
          AND NOT EXISTS (
            SELECT 1 FROM public.user_roles ur2
            WHERE ur2.user_id = yp.profile_id AND ur2.role IN ('admin', 'super_admin')
          )
      );

  -- Concluíram: jovens ativos reais que concluíram a última fase
  SELECT COUNT(DISTINCT ups.user_id) INTO v_completed
    FROM public.user_phase_status ups
    JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
    WHERE ph.order_index = v_max_order AND ups.status = 'concluido'
      AND EXISTS (
        SELECT 1 FROM public.young_people yp
        JOIN public.user_roles ur ON ur.user_id = yp.profile_id AND ur.role = 'jovem_aprendiz'
        WHERE yp.profile_id = ups.user_id
          AND yp.status NOT IN ('desligado', 'reprovado', 'cancelada')
          AND NOT EXISTS (
            SELECT 1 FROM public.user_roles ur2
            WHERE ur2.user_id = yp.profile_id AND ur2.role IN ('admin', 'super_admin')
          )
      );

  -- Total Jovens ativos
  SELECT COUNT(yp.id) INTO v_total_jovens
    FROM public.young_people yp
    JOIN public.user_roles ur ON ur.user_id = yp.profile_id AND ur.role = 'jovem_aprendiz'
    WHERE yp.profile_id IS NOT NULL
      AND yp.status NOT IN ('desligado', 'reprovado', 'cancelada')
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur2
        WHERE ur2.user_id = yp.profile_id AND ur2.role IN ('admin', 'super_admin')
      );

  -- Abandonaram: jovens ativos reais não concluídos sem atividade nos últimos 7 dias
  SELECT COUNT(yp.id) INTO v_abandoned
    FROM public.young_people yp
    JOIN public.user_roles ur ON ur.user_id = yp.profile_id AND ur.role = 'jovem_aprendiz'
    WHERE yp.profile_id IS NOT NULL
      AND yp.status NOT IN ('desligado', 'reprovado', 'cancelada')
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur2
        WHERE ur2.user_id = yp.profile_id AND ur2.role IN ('admin', 'super_admin')
      )
      AND NOT EXISTS (
        -- Não concluiu a última fase
        SELECT 1 FROM public.user_phase_status ups
        JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
        WHERE ups.user_id = yp.profile_id AND ph.order_index = v_max_order AND ups.status = 'concluido'
      )
      AND (
        COALESCE(
          (SELECT MAX(COALESCE(ups.completed_at, ups.unlocked_at, yp.created_at)) FROM public.user_phase_status ups WHERE ups.user_id = yp.profile_id),
          yp.created_at
        ) < NOW() - INTERVAL '7 days'
      );

  -- Tentativas de quiz de jovens ativos reais (ambas as tabelas)
  SELECT COUNT(*) INTO v_quiz_total FROM (
    SELECT jqa.id FROM public.journey_quiz_attempts jqa
      JOIN public.user_roles ur ON ur.user_id = jqa.user_id AND ur.role = 'jovem_aprendiz'
      WHERE EXISTS (
        SELECT 1 FROM public.young_people yp 
        WHERE yp.profile_id = jqa.user_id
          AND yp.status NOT IN ('desligado', 'reprovado', 'cancelada')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur2
        WHERE ur2.user_id = jqa.user_id AND ur2.role IN ('admin', 'super_admin')
      )
    UNION ALL
    SELECT yqa.id FROM public.young_quiz_attempts yqa
      WHERE EXISTS (
        SELECT 1 FROM public.young_people yp 
        JOIN public.user_roles ur ON ur.user_id = yp.profile_id AND ur.role = 'jovem_aprendiz'
        WHERE yp.id = yqa.young_id
          AND yp.status NOT IN ('desligado', 'reprovado', 'cancelada')
          AND NOT EXISTS (
            SELECT 1 FROM public.user_roles ur2
            WHERE ur2.user_id = yp.profile_id AND ur2.role IN ('admin', 'super_admin')
          )
      )
  ) all_attempts;

  SELECT COUNT(*) INTO v_quiz_passed FROM (
    SELECT jqa.id FROM public.journey_quiz_attempts jqa
      JOIN public.user_roles ur ON ur.user_id = jqa.user_id AND ur.role = 'jovem_aprendiz'
      WHERE jqa.passed = true
        AND EXISTS (
          SELECT 1 FROM public.young_people yp 
          WHERE yp.profile_id = jqa.user_id
            AND yp.status NOT IN ('desligado', 'reprovado', 'cancelada')
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles ur2
          WHERE ur2.user_id = jqa.user_id AND ur2.role IN ('admin', 'super_admin')
        )
    UNION ALL
    SELECT yqa.id FROM public.young_quiz_attempts yqa
      WHERE yqa.passed = true
        AND EXISTS (
          SELECT 1 FROM public.young_people yp 
          JOIN public.user_roles ur ON ur.user_id = yp.profile_id AND ur.role = 'jovem_aprendiz'
          WHERE yp.id = yqa.young_id
            AND yp.status NOT IN ('desligado', 'reprovado', 'cancelada')
            AND NOT EXISTS (
              SELECT 1 FROM public.user_roles ur2
              WHERE ur2.user_id = yp.profile_id AND ur2.role IN ('admin', 'super_admin')
            )
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
