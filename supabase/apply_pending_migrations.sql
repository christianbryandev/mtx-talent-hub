-- Trigger: Completar fase automaticamente quando todos os módulos forem concluídos.
-- Disparado AFTER INSERT OR UPDATE ON user_module_progress.
-- Ações:
--   1. Upsert user_phase_status com status = 'concluido'
--   2. Desbloqueia a próxima fase (por order_index)
--   3. Concede XP da fase via process_xp_event

CREATE OR REPLACE FUNCTION public.handle_phase_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phase_id uuid;
  v_phase_order int;
  v_phase_has_quiz boolean;
  v_phase_xp int;
  v_total_modules int;
  v_completed_modules int;
  v_quiz_passed boolean;
  v_next_phase_id uuid;
  v_already_completed boolean;
BEGIN
  -- Só processa quando o módulo foi marcado como completo
  IF NEW.completed IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Busca informações da fase deste módulo
  SELECT jm.phase_id INTO v_phase_id
    FROM public.journey_modules jm
   WHERE jm.id = NEW.module_id;

  IF v_phase_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verifica se a fase já está concluída (evita reprocessamento)
  SELECT (ups.status = 'concluido') INTO v_already_completed
    FROM public.user_phase_status ups
   WHERE ups.user_id = NEW.user_id AND ups.phase_id = v_phase_id;

  IF v_already_completed IS TRUE THEN
    RETURN NEW;
  END IF;

  -- Busca metadados da fase
  SELECT pc.order_index, pc.has_quiz, COALESCE(pc.xp_reward, 0)
    INTO v_phase_order, v_phase_has_quiz, v_phase_xp
    FROM public.journey_phase_catalog pc
   WHERE pc.id = v_phase_id;

  -- Conta módulos totais e completados da fase para este usuário
  SELECT COUNT(*) INTO v_total_modules
    FROM public.journey_modules jm
   WHERE jm.phase_id = v_phase_id;

  SELECT COUNT(*) INTO v_completed_modules
    FROM public.journey_modules jm
    JOIN public.user_module_progress ump ON ump.module_id = jm.id
   WHERE jm.phase_id = v_phase_id
     AND ump.user_id = NEW.user_id
     AND ump.completed = true;

  -- Se nem todos os módulos estão completos, sai
  IF v_completed_modules < v_total_modules THEN
    RETURN NEW;
  END IF;

  -- Se a fase tem quiz, verifica se o usuário já passou
  IF v_phase_has_quiz IS TRUE THEN
    -- Quiz ID vem de um módulo do tipo 'quiz' na fase, ou do campo quiz_id
    SELECT EXISTS(
      SELECT 1 FROM public.young_quiz_attempts yqa
       WHERE yqa.young_id = NEW.user_id
         AND yqa.passed = true
         AND yqa.phase IN (
           -- Tenta pelo quiz_id dos módulos da fase
           SELECT jm2.quiz_id::text
             FROM public.journey_modules jm2
            WHERE jm2.phase_id = v_phase_id
              AND jm2.quiz_id IS NOT NULL
         )
    ) INTO v_quiz_passed;

    -- Se quiz não passou, não completa a fase ainda
    IF v_quiz_passed IS NOT TRUE THEN
      RETURN NEW;
    END IF;
  END IF;

  -- === FASE COMPLETA! ===

  -- 1. Upsert user_phase_status para 'concluido'
  INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at, completed_at)
  VALUES (NEW.user_id, v_phase_id, 'concluido', true, now(), now())
  ON CONFLICT (user_id, phase_id) DO UPDATE
    SET status = 'concluido',
        completed_at = COALESCE(user_phase_status.completed_at, now());

  -- 2. Desbloqueia próxima fase
  SELECT pc.id INTO v_next_phase_id
    FROM public.journey_phase_catalog pc
   WHERE pc.order_index > v_phase_order
   ORDER BY pc.order_index ASC
   LIMIT 1;

  IF v_next_phase_id IS NOT NULL THEN
    INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at)
    VALUES (NEW.user_id, v_next_phase_id, 'pendente', true, now())
    ON CONFLICT (user_id, phase_id) DO UPDATE
      SET unlocked = true,
          unlocked_at = COALESCE(user_phase_status.unlocked_at, now());
  END IF;

  -- 3. Concede XP da fase (se > 0)
  IF v_phase_xp > 0 THEN
    -- process_xp_event usa ON CONFLICT DO NOTHING internamente (idempotente)
    INSERT INTO public.xp_events (user_id, event_type, reference_id, xp_amount)
    VALUES (NEW.user_id, 'phase_completed', v_phase_id, v_phase_xp)
    ON CONFLICT (user_id, event_type, reference_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar o trigger
DROP TRIGGER IF EXISTS trg_phase_completion ON public.user_module_progress;
CREATE TRIGGER trg_phase_completion
  AFTER INSERT OR UPDATE ON public.user_module_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_phase_completion();

-- Também disparar ao submeter quiz com sucesso (caso o quiz seja o último passo)
-- Criamos um trigger na young_quiz_attempts para re-checar a fase
CREATE OR REPLACE FUNCTION public.handle_quiz_phase_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phase_id uuid;
  v_phase_order int;
  v_phase_xp int;
  v_total_modules int;
  v_completed_modules int;
  v_next_phase_id uuid;
  v_already_completed boolean;
BEGIN
  -- Só processa quando o quiz foi passado
  IF NEW.passed IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Encontra a fase pelo quiz_id (NEW.phase contém o quiz_id::text)
  SELECT jm.phase_id INTO v_phase_id
    FROM public.journey_modules jm
   WHERE jm.quiz_id::text = NEW.phase
   LIMIT 1;

  IF v_phase_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verifica se a fase já está concluída
  SELECT (ups.status = 'concluido') INTO v_already_completed
    FROM public.user_phase_status ups
   WHERE ups.user_id = NEW.young_id AND ups.phase_id = v_phase_id;

  IF v_already_completed IS TRUE THEN
    RETURN NEW;
  END IF;

  -- Verifica se todos os módulos da fase estão completos
  SELECT COUNT(*) INTO v_total_modules
    FROM public.journey_modules jm
   WHERE jm.phase_id = v_phase_id;

  SELECT COUNT(*) INTO v_completed_modules
    FROM public.journey_modules jm
    JOIN public.user_module_progress ump ON ump.module_id = jm.id
   WHERE jm.phase_id = v_phase_id
     AND ump.user_id = NEW.young_id
     AND ump.completed = true;

  IF v_completed_modules < v_total_modules THEN
    RETURN NEW;
  END IF;

  -- === FASE COMPLETA! ===

  -- Busca metadados
  SELECT pc.order_index, COALESCE(pc.xp_reward, 0)
    INTO v_phase_order, v_phase_xp
    FROM public.journey_phase_catalog pc
   WHERE pc.id = v_phase_id;

  -- 1. Marca fase como concluída
  INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at, completed_at)
  VALUES (NEW.young_id, v_phase_id, 'concluido', true, now(), now())
  ON CONFLICT (user_id, phase_id) DO UPDATE
    SET status = 'concluido',
        completed_at = COALESCE(user_phase_status.completed_at, now());

  -- 2. Desbloqueia próxima fase
  SELECT pc.id INTO v_next_phase_id
    FROM public.journey_phase_catalog pc
   WHERE pc.order_index > v_phase_order
   ORDER BY pc.order_index ASC
   LIMIT 1;

  IF v_next_phase_id IS NOT NULL THEN
    INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at)
    VALUES (NEW.young_id, v_next_phase_id, 'pendente', true, now())
    ON CONFLICT (user_id, phase_id) DO UPDATE
      SET unlocked = true,
          unlocked_at = COALESCE(user_phase_status.unlocked_at, now());
  END IF;

  -- 3. Concede XP da fase
  IF v_phase_xp > 0 THEN
    INSERT INTO public.xp_events (user_id, event_type, reference_id, xp_amount)
    VALUES (NEW.young_id, 'phase_completed', v_phase_id, v_phase_xp)
    ON CONFLICT (user_id, event_type, reference_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quiz_phase_completion ON public.young_quiz_attempts;
CREATE TRIGGER trg_quiz_phase_completion
  AFTER INSERT ON public.young_quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_quiz_phase_completion();
-- Fix: Atualizar RPCs admin_get_journey_monitor e admin_get_journey_tracking
-- para usar user_module_progress (modelo atual) em vez de user_checklist_progress (legado).

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
      (
        SELECT passed FROM public.journey_quiz_attempts
        WHERE user_id = bu.user_id ORDER BY created_at DESC LIMIT 1
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
-- Backfill: Persistir status 'concluido' para fases que já estão 100% completas
-- mas não foram processadas pelo trigger (dados anteriores à criação do trigger).
-- Também desbloqueia a próxima fase e concede XP retroativamente.

DO $$
DECLARE
  r RECORD;
  v_next_phase_id uuid;
  v_phase_xp int;
BEGIN
  -- Para cada combinação (user, phase) onde TODOS os módulos estão completos
  -- mas user_phase_status NÃO está como 'concluido'
  FOR r IN
    SELECT
      ump.user_id,
      jm.phase_id,
      pc.order_index,
      pc.has_quiz,
      COALESCE(pc.xp_reward, 0) AS xp_reward
    FROM public.user_module_progress ump
    JOIN public.journey_modules jm ON jm.id = ump.module_id
    JOIN public.journey_phase_catalog pc ON pc.id = jm.phase_id
    WHERE ump.completed = true
    GROUP BY ump.user_id, jm.phase_id, pc.order_index, pc.has_quiz, pc.xp_reward
    HAVING COUNT(*) = (
      SELECT COUNT(*) FROM public.journey_modules WHERE phase_id = jm.phase_id
    )
  LOOP
    -- Verifica se já está concluído
    IF EXISTS (
      SELECT 1 FROM public.user_phase_status
      WHERE user_id = r.user_id AND phase_id = r.phase_id AND status = 'concluido'
    ) THEN
      CONTINUE;
    END IF;

    -- Se tem quiz, verifica se passou
    IF r.has_quiz IS TRUE THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.young_quiz_attempts yqa
        WHERE yqa.young_id = r.user_id
          AND yqa.passed = true
          AND yqa.phase IN (
            SELECT jm2.quiz_id::text
            FROM public.journey_modules jm2
            WHERE jm2.phase_id = r.phase_id AND jm2.quiz_id IS NOT NULL
          )
      ) THEN
        CONTINUE; -- Quiz não passou, não pode concluir
      END IF;
    END IF;

    -- 1. Marca fase como concluída
    INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at, completed_at)
    VALUES (r.user_id, r.phase_id, 'concluido', true, now(), now())
    ON CONFLICT (user_id, phase_id) DO UPDATE
      SET status = 'concluido',
          completed_at = COALESCE(user_phase_status.completed_at, now());

    -- 2. Desbloqueia próxima fase
    SELECT pc2.id INTO v_next_phase_id
    FROM public.journey_phase_catalog pc2
    WHERE pc2.order_index > r.order_index
    ORDER BY pc2.order_index ASC
    LIMIT 1;

    IF v_next_phase_id IS NOT NULL THEN
      INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at)
      VALUES (r.user_id, v_next_phase_id, 'pendente', true, now())
      ON CONFLICT (user_id, phase_id) DO UPDATE
        SET unlocked = true,
            unlocked_at = COALESCE(user_phase_status.unlocked_at, now());
    END IF;

    -- 3. Concede XP da fase (idempotente)
    IF r.xp_reward > 0 THEN
      INSERT INTO public.xp_events (user_id, event_type, reference_id, xp_amount)
      VALUES (r.user_id, 'phase_completed', r.phase_id, r.xp_reward)
      ON CONFLICT (user_id, event_type, reference_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;
-- Fix: Permitir que admins vejam o progresso de módulos de todos os usuários.
-- Sem essa policy, o ProgressMini na aba Jovens retorna 0% para todos
-- porque a RLS só permite SELECT onde auth.uid() = user_id.

CREATE POLICY "Admins can view all module progress"
ON public.user_module_progress FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);
