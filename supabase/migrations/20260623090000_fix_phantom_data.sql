-- =========================================================================
-- 1. CLEANUP IMEDIATO DE REGISTROS FANTASMA E ÓRFÃOS
-- =========================================================================

-- Remover progresso de fase órfão para jovens que não existem mais na tabela young_people
DELETE FROM public.user_phase_status ups
WHERE NOT EXISTS (
  SELECT 1 FROM public.young_people yp
  WHERE yp.profile_id = ups.user_id
);

-- Remover progresso de módulo órfão para jovens que não existem mais
DELETE FROM public.user_module_progress ump
WHERE NOT EXISTS (
  SELECT 1 FROM public.young_people yp
  WHERE yp.profile_id = ump.user_id
);

-- Remover tentativas de quizzes órfãs da jornada
DELETE FROM public.journey_quiz_attempts jqa
WHERE NOT EXISTS (
  SELECT 1 FROM public.young_people yp
  WHERE yp.profile_id = jqa.user_id
);

-- Remover tentativas de quizzes órfãs dos jovens
DELETE FROM public.young_quiz_attempts yqa
WHERE NOT EXISTS (
  SELECT 1 FROM public.young_people yp
  WHERE yp.id = yqa.young_id
);

-- Remover eventos de XP órfãos
DELETE FROM public.xp_events xe
WHERE NOT EXISTS (
  SELECT 1 FROM public.young_people yp
  WHERE yp.profile_id = xe.user_id
);

-- Corrigir indicador de primeiro cliente para jovens que não possuem serviços ativos de clientes
UPDATE public.young_people yp
SET first_client_attended = false,
    first_client_date = null
WHERE yp.first_client_attended = true
  AND NOT EXISTS (
    SELECT 1 FROM public.client_services cs
    JOIN public.clients c ON c.id = cs.client_id
    WHERE cs.executor_id = yp.id
      AND cs.status = 'ativo'
  );

-- Deletar logs de atividades associados a entidades excluídas
DELETE FROM public.activity_logs
WHERE (entity_type = 'opportunity' AND entity_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.opportunities WHERE id = entity_id))
   OR (entity_type = 'client' AND entity_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.clients WHERE id = entity_id))
   OR (entity_type IN ('young_person', 'young_people') AND entity_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.young_people WHERE id = entity_id))
   OR (entity_type = 'task' AND entity_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tasks WHERE id = entity_id))
   OR (entity_type = 'meeting' AND entity_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.meetings WHERE id = entity_id))
   OR (entity_type IN ('user', 'profiles') AND entity_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = entity_id))
   OR (entity_type = 'service' AND entity_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.services WHERE id = entity_id));


-- =========================================================================
-- 2. READEQUAÇÃO DAS FUNÇÕES RPC DE ANALYTICS (Analytics Jornada)
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
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT MAX(order_index) INTO v_max_order FROM public.journey_phase_catalog;

  -- Total de jovens cadastrados na tabela de jovens
  SELECT COUNT(DISTINCT yp.profile_id) INTO v_total_users
    FROM public.young_people yp
    WHERE yp.profile_id IS NOT NULL;

  -- Em andamento: jovens na tabela de jovens com alguma fase em andamento ou progresso de módulos
  SELECT COUNT(DISTINCT u.user_id) INTO v_active_users
  FROM (
    SELECT user_id FROM public.user_phase_status WHERE status = 'em_andamento'
    UNION
    SELECT user_id FROM public.user_module_progress WHERE completed = true
  ) u
  WHERE EXISTS (
    SELECT 1 FROM public.young_people yp WHERE yp.profile_id = u.user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_phase_status ups2
    JOIN public.journey_phase_catalog ph2 ON ph2.id = ups2.phase_id
    WHERE ups2.user_id = u.user_id AND ph2.order_index = v_max_order AND ups2.status = 'concluido'
  );

  -- Concluídos: jovens na tabela de jovens que concluíram a última fase da jornada
  SELECT COUNT(*) INTO v_completed_users
  FROM (
    SELECT ups.user_id
    FROM public.user_phase_status ups
    JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
    WHERE ph.order_index = v_max_order AND ups.status = 'concluido'
      AND EXISTS (
        SELECT 1 FROM public.young_people yp WHERE yp.profile_id = ups.user_id
      )
  ) s;

  -- Média de XP para jovens reais na tabela de jovens
  SELECT COALESCE(AVG(total_xp), 0) INTO v_avg_xp FROM (
    SELECT user_id, SUM(xp_amount)::numeric AS total_xp
    FROM public.xp_events 
    WHERE EXISTS (
      SELECT 1 FROM public.young_people yp WHERE yp.profile_id = user_id
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
      COUNT(DISTINCT ups.user_id) FILTER (
        WHERE (COALESCE(ups.status,'pendente') = 'pendente' AND COALESCE(ups.unlocked,false) = true)
           OR ups.status = 'em_andamento'
      )::int AS total_users
    FROM public.journey_phase_catalog ph
    LEFT JOIN public.user_phase_status ups ON ups.phase_id = ph.id
      AND EXISTS (
        SELECT 1 FROM public.young_people yp WHERE yp.profile_id = ups.user_id
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
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT MAX(order_index) INTO v_max_order FROM public.journey_phase_catalog;

  -- Iniciaram: jovens reais que têm alguma fase em_andamento ou concluído
  SELECT COUNT(DISTINCT ups.user_id) INTO v_started
    FROM public.user_phase_status ups
    WHERE ups.status IN ('em_andamento','concluido')
      AND EXISTS (
        SELECT 1 FROM public.young_people yp WHERE yp.profile_id = ups.user_id
      );

  -- Concluíram: jovens reais que concluíram a última fase
  SELECT COUNT(DISTINCT ups.user_id) INTO v_completed
    FROM public.user_phase_status ups
    JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
    WHERE ph.order_index = v_max_order AND ups.status = 'concluido'
      AND EXISTS (
        SELECT 1 FROM public.young_people yp WHERE yp.profile_id = ups.user_id
      );

  -- Total Jovens
  SELECT COUNT(yp.id) INTO v_total_jovens
    FROM public.young_people yp
    WHERE yp.profile_id IS NOT NULL;

  -- Abandonaram: jovens reais não concluídos sem atividade nos últimos 7 dias
  SELECT COUNT(yp.id) INTO v_abandoned
    FROM public.young_people yp
    WHERE yp.profile_id IS NOT NULL
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

  -- Tentativas de quiz de jovens reais
  SELECT COUNT(*) INTO v_quiz_total FROM (
    SELECT jqa.id FROM public.journey_quiz_attempts jqa
      WHERE EXISTS (
        SELECT 1 FROM public.young_people yp WHERE yp.profile_id = jqa.user_id
      )
    UNION ALL
    SELECT yqa.id FROM public.young_quiz_attempts yqa
      WHERE EXISTS (
        SELECT 1 FROM public.young_people yp WHERE yp.id = yqa.young_id
      )
  ) all_attempts;

  SELECT COUNT(*) INTO v_quiz_passed FROM (
    SELECT jqa.id FROM public.journey_quiz_attempts jqa
      WHERE jqa.passed = true
        AND EXISTS (
          SELECT 1 FROM public.young_people yp WHERE yp.profile_id = jqa.user_id
        )
    UNION ALL
    SELECT yqa.id FROM public.young_quiz_attempts yqa
      WHERE yqa.passed = true
        AND EXISTS (
          SELECT 1 FROM public.young_people yp WHERE yp.id = yqa.young_id
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


-- =========================================================================
-- 3. TRIGGERS DE INTEGRIDADE PARA EVITAR ACÚMULO DE DADOS FANTASMA NO FUTURO
-- =========================================================================

-- A. Limpeza de logs de oportunidade deletada
CREATE OR REPLACE FUNCTION public.trg_clean_opportunity_logs_fn()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.activity_logs
  WHERE entity_type = 'opportunity' AND entity_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_clean_opportunity_logs
AFTER DELETE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.trg_clean_opportunity_logs_fn();


-- B. Limpeza de logs de cliente deletado
CREATE OR REPLACE FUNCTION public.trg_clean_client_logs_fn()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.activity_logs
  WHERE entity_type = 'client' AND entity_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_clean_client_logs
AFTER DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.trg_clean_client_logs_fn();


-- C. Limpeza de logs de jovem deletado
CREATE OR REPLACE FUNCTION public.trg_clean_young_people_logs_fn()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.activity_logs
  WHERE entity_type IN ('young_person', 'young_people') AND entity_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_clean_young_people_logs
AFTER DELETE ON public.young_people
FOR EACH ROW EXECUTE FUNCTION public.trg_clean_young_people_logs_fn();


-- D. Limpeza de logs de tarefa deletada
CREATE OR REPLACE FUNCTION public.trg_clean_task_logs_fn()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.activity_logs
  WHERE entity_type = 'task' AND entity_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_clean_task_logs
AFTER DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.trg_clean_task_logs_fn();


-- E. Limpeza de logs de reunião deletada
CREATE OR REPLACE FUNCTION public.trg_clean_meeting_logs_fn()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.activity_logs
  WHERE entity_type = 'meeting' AND entity_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_clean_meeting_logs
AFTER DELETE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.trg_clean_meeting_logs_fn();


-- F. Reversão automática de first_client_attended ao deletar ou desativar serviços de clientes
CREATE OR REPLACE FUNCTION public.check_young_first_client_on_service_delete_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o serviço foi excluído
  IF TG_OP = 'DELETE' THEN
    IF OLD.executor_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.client_services cs
        JOIN public.clients c ON c.id = cs.client_id
        WHERE cs.executor_id = OLD.executor_id
          AND cs.status = 'ativo'
      ) THEN
        UPDATE public.young_people
        SET first_client_attended = false,
            first_client_date = null
        WHERE id = OLD.executor_id;
      END IF;
    END IF;
  -- Se o executor ou status do serviço foi alterado
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.executor_id IS NOT NULL AND (OLD.executor_id IS DISTINCT FROM NEW.executor_id OR NEW.status IS DISTINCT FROM 'ativo') THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.client_services cs
        JOIN public.clients c ON c.id = cs.client_id
        WHERE cs.executor_id = OLD.executor_id
          AND cs.status = 'ativo'
      ) THEN
        UPDATE public.young_people
        SET first_client_attended = false,
            first_client_date = null
        WHERE id = OLD.executor_id;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_client_services_first_client_cleanup
AFTER DELETE OR UPDATE OF status, executor_id ON public.client_services
FOR EACH ROW
EXECUTE FUNCTION public.check_young_first_client_on_service_delete_fn();


-- G. Limpeza de logs de usuário/perfil deletado
CREATE OR REPLACE FUNCTION public.trg_clean_profile_logs_fn()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.activity_logs
  WHERE entity_type IN ('user', 'profiles') AND entity_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_clean_profile_logs
AFTER DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_clean_profile_logs_fn();


-- H. Limpeza de logs de serviço deletado
CREATE OR REPLACE FUNCTION public.trg_clean_service_logs_fn()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.activity_logs
  WHERE entity_type = 'service' AND entity_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_clean_service_logs
AFTER DELETE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.trg_clean_service_logs_fn();
