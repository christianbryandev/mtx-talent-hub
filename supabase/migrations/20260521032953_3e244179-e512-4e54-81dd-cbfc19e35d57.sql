
-- 1. system_logs
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  status text NOT NULL CHECK (status IN ('success','error','warning','info')),
  error_code text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_logs_action_created ON public.system_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_created ON public.system_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_status ON public.system_logs(status) WHERE status = 'error';

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_logs_admin_read ON public.system_logs;
CREATE POLICY system_logs_admin_read ON public.system_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- No INSERT/UPDATE/DELETE policy: only SECURITY DEFINER functions write.

-- 2. system_events
CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_events_type_created ON public.system_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_user_created ON public.system_events(user_id, created_at DESC);

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_events_admin_read ON public.system_events;
CREATE POLICY system_events_admin_read ON public.system_events
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Safe logger (never throws)
CREATE OR REPLACE FUNCTION public.log_system_event(
  _user_id uuid,
  _action text,
  _status text,
  _error_code text,
  _error_message text,
  _metadata jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.system_logs(user_id, action, status, error_code, error_message, metadata)
    VALUES (_user_id, _action, _status, _error_code, _error_message, COALESCE(_metadata, '{}'::jsonb));
  EXCEPTION WHEN OTHERS THEN
    -- Swallow logging errors to never break the main flow
    NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_system_event(
  _user_id uuid,
  _event_type text,
  _entity_type text,
  _entity_id uuid,
  _payload jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.system_events(user_id, event_type, entity_type, entity_id, payload)
    VALUES (_user_id, _event_type, _entity_type, _entity_id, COALESCE(_payload, '{}'::jsonb));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

-- 4. Hardened submit_phase_quiz
CREATE OR REPLACE FUNCTION public.submit_phase_quiz(_phase_id uuid, _answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_quiz record;
  v_total int;
  v_correct int := 0;
  v_score numeric;
  v_passed boolean;
  v_attempt_number int;
  v_next_phase_id uuid;
  v_phase_xp int;
  v_cards_total int;
  v_cards_done int;
  v_quiz_count int;
  v_existing record;
  v_err_code text;
  v_err_msg text;
BEGIN
  -- Auth gate
  IF v_user IS NULL THEN
    PERFORM public.log_system_event(NULL, 'submit_phase_quiz', 'error', 'unauthorized', 'No authenticated user',
      jsonb_build_object('phase_id', _phase_id));
    RETURN jsonb_build_object('success', false,
      'error', jsonb_build_object('code','unauthorized','message','Usuário não autenticado.'));
  END IF;

  -- Input validation
  IF _phase_id IS NULL THEN
    PERFORM public.log_system_event(v_user, 'submit_phase_quiz', 'error', 'invalid_input', 'phase_id is null', '{}'::jsonb);
    RETURN jsonb_build_object('success', false,
      'error', jsonb_build_object('code','invalid_input','message','Fase inválida.'));
  END IF;

  IF _answers IS NULL OR jsonb_typeof(_answers) <> 'array' THEN
    PERFORM public.log_system_event(v_user, 'submit_phase_quiz', 'error', 'invalid_input', 'answers not array',
      jsonb_build_object('phase_id', _phase_id));
    RETURN jsonb_build_object('success', false,
      'error', jsonb_build_object('code','invalid_input','message','Respostas inválidas.'));
  END IF;

  BEGIN
    -- Single active quiz constraint
    SELECT COUNT(*) INTO v_quiz_count FROM public.quiz_templates
      WHERE phase_id = _phase_id AND is_active = true;
    IF v_quiz_count > 1 THEN
      PERFORM public.log_system_event(v_user, 'submit_phase_quiz', 'error', 'multiple_active_quizzes', NULL,
        jsonb_build_object('phase_id', _phase_id, 'count', v_quiz_count));
      RETURN jsonb_build_object('success', false,
        'error', jsonb_build_object('code','multiple_active_quizzes','message','Configuração inválida: mais de um quiz ativo nesta fase.'));
    END IF;

    SELECT * INTO v_quiz FROM public.quiz_templates
      WHERE phase_id = _phase_id AND is_active = true;
    IF NOT FOUND THEN
      PERFORM public.log_system_event(v_user, 'submit_phase_quiz', 'error', 'no_active_quiz', NULL,
        jsonb_build_object('phase_id', _phase_id));
      RETURN jsonb_build_object('success', false,
        'error', jsonb_build_object('code','no_active_quiz','message','Nenhum quiz ativo para esta fase.'));
    END IF;

    -- Idempotency: if already passed, return previous result as success
    SELECT score, passed, attempt_number INTO v_existing
      FROM public.journey_quiz_attempts
      WHERE user_id = v_user AND quiz_id = v_quiz.id AND passed = true
      ORDER BY attempt_number DESC LIMIT 1;
    IF FOUND THEN
      PERFORM public.log_system_event(v_user, 'submit_phase_quiz', 'info', 'idempotent_already_passed', NULL,
        jsonb_build_object('phase_id', _phase_id, 'quiz_id', v_quiz.id));
      SELECT COUNT(*) INTO v_total FROM public.quiz_questions WHERE quiz_id = v_quiz.id;
      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'score', v_existing.score,
        'passed', true,
        'attempt_number', v_existing.attempt_number,
        'correct', ROUND(v_existing.score * v_total / 100.0),
        'total', v_total,
        'passing_score', v_quiz.passing_score
      );
    END IF;

    SELECT COUNT(*) INTO v_total FROM public.quiz_questions WHERE quiz_id = v_quiz.id;
    IF v_total = 0 THEN
      PERFORM public.log_system_event(v_user, 'submit_phase_quiz', 'error', 'quiz_has_no_questions', NULL,
        jsonb_build_object('phase_id', _phase_id, 'quiz_id', v_quiz.id));
      RETURN jsonb_build_object('success', false,
        'error', jsonb_build_object('code','quiz_has_no_questions','message','O quiz não possui perguntas configuradas.'));
    END IF;

    SELECT COUNT(*) INTO v_correct
    FROM jsonb_array_elements(_answers) a
    JOIN public.quiz_options qo ON qo.id = (a->>'option_id')::uuid
    JOIN public.quiz_questions qq ON qq.id = qo.question_id
    WHERE qq.quiz_id = v_quiz.id
      AND qq.id = (a->>'question_id')::uuid
      AND qo.is_correct = true;

    v_score := ROUND((v_correct::numeric / v_total::numeric) * 100, 2);
    v_passed := v_score >= v_quiz.passing_score;

    SELECT COALESCE(MAX(attempt_number),0)+1 INTO v_attempt_number
      FROM public.journey_quiz_attempts
      WHERE user_id = v_user AND quiz_id = v_quiz.id;

    INSERT INTO public.journey_quiz_attempts (user_id, phase_id, quiz_id, score, passed, attempt_number)
    VALUES (v_user, _phase_id, v_quiz.id, v_score, v_passed, v_attempt_number);

    IF v_passed THEN
      SELECT COUNT(*) INTO v_cards_total FROM public.journey_cards WHERE phase_id = _phase_id;
      SELECT COUNT(*) INTO v_cards_done FROM public.user_card_progress ucp
        JOIN public.journey_cards jc ON jc.id = ucp.card_id
        WHERE ucp.user_id = v_user AND jc.phase_id = _phase_id AND ucp.completed = true;

      IF v_cards_total = 0 OR v_cards_done >= v_cards_total THEN
        INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at, completed_at)
        VALUES (v_user, _phase_id, 'concluido', true, now(), now())
        ON CONFLICT (user_id, phase_id) DO UPDATE
          SET status = 'concluido',
              completed_at = COALESCE(public.user_phase_status.completed_at, now());

        SELECT COALESCE(xp_reward,0) INTO v_phase_xp FROM public.journey_phase_catalog WHERE id = _phase_id;
        PERFORM public.process_xp_event(v_user, 'phase_completed', _phase_id, v_phase_xp);

        SELECT id INTO v_next_phase_id FROM public.journey_phase_catalog
          WHERE order_index = (SELECT order_index + 1 FROM public.journey_phase_catalog WHERE id = _phase_id)
          LIMIT 1;
        IF v_next_phase_id IS NOT NULL THEN
          INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at)
          VALUES (v_user, v_next_phase_id, 'pendente', true, now())
          ON CONFLICT (user_id, phase_id) DO UPDATE
            SET unlocked = true,
                unlocked_at = COALESCE(public.user_phase_status.unlocked_at, now());
        END IF;
      END IF;
    END IF;

    PERFORM public.log_system_event(v_user, 'submit_phase_quiz', 'success', NULL, NULL,
      jsonb_build_object('phase_id', _phase_id, 'quiz_id', v_quiz.id,
        'score', v_score, 'passed', v_passed, 'attempt', v_attempt_number));

    PERFORM public.record_system_event(v_user, 'quiz_completed', 'quiz', v_quiz.id,
      jsonb_build_object('phase_id', _phase_id, 'score', v_score, 'passed', v_passed,
        'attempt_number', v_attempt_number));

    RETURN jsonb_build_object(
      'success', true,
      'score', v_score,
      'passed', v_passed,
      'attempt_number', v_attempt_number,
      'correct', v_correct,
      'total', v_total,
      'passing_score', v_quiz.passing_score
    );

  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
    PERFORM public.log_system_event(v_user, 'submit_phase_quiz', 'error', v_err_code, v_err_msg,
      jsonb_build_object('phase_id', _phase_id));
    RETURN jsonb_build_object('success', false,
      'error', jsonb_build_object('code','internal_error','message','Erro interno ao processar o quiz.'));
  END;
END;
$$;

-- 5. Update toggle_checklist_item to emit a system_event on card completion
CREATE OR REPLACE FUNCTION public.toggle_checklist_item(_user_id uuid, _item_id uuid, _completed boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id uuid;
  v_phase_id uuid;
  v_card_xp int;
  v_total int;
  v_done int;
  v_card_completed boolean := false;
  v_err_code text;
  v_err_msg text;
BEGIN
  IF _user_id IS NULL OR _user_id <> auth.uid() THEN
    PERFORM public.log_system_event(auth.uid(), 'toggle_checklist_item', 'error', 'unauthorized', NULL,
      jsonb_build_object('item_id', _item_id));
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT jc.id, jc.phase_id, COALESCE(jc.xp_reward,0)
    INTO v_card_id, v_phase_id, v_card_xp
  FROM public.journey_checklist_items ci
  JOIN public.journey_cards jc ON jc.id = ci.card_id
  WHERE ci.id = _item_id;
  IF v_card_id IS NULL THEN
    PERFORM public.log_system_event(_user_id, 'toggle_checklist_item', 'error', 'item_not_found', NULL,
      jsonb_build_object('item_id', _item_id));
    RAISE EXCEPTION 'item not found';
  END IF;

  IF _completed THEN
    INSERT INTO public.user_checklist_progress (user_id, checklist_item_id)
    VALUES (_user_id, _item_id)
    ON CONFLICT (user_id, checklist_item_id) DO NOTHING;
  ELSE
    DELETE FROM public.user_checklist_progress
    WHERE user_id = _user_id AND checklist_item_id = _item_id;
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.journey_checklist_items
    WHERE card_id = v_card_id AND required = true;
  SELECT COUNT(*) INTO v_done FROM public.user_checklist_progress ucp
    JOIN public.journey_checklist_items ci ON ci.id = ucp.checklist_item_id
    WHERE ucp.user_id = _user_id AND ci.card_id = v_card_id AND ci.required = true;

  IF v_total > 0 AND v_done >= v_total THEN
    INSERT INTO public.user_card_progress (user_id, card_id, completed, completed_at)
    VALUES (_user_id, v_card_id, true, now())
    ON CONFLICT (user_id, card_id) DO UPDATE
      SET completed = true,
          completed_at = COALESCE(public.user_card_progress.completed_at, now());
    v_card_completed := true;
    PERFORM public.process_xp_event(_user_id, 'card_completed', v_card_id, v_card_xp);
    PERFORM public.record_system_event(_user_id, 'card_completed', 'card', v_card_id,
      jsonb_build_object('phase_id', v_phase_id, 'xp', v_card_xp));
  ELSE
    UPDATE public.user_card_progress
       SET completed = false
     WHERE user_id = _user_id AND card_id = v_card_id;
  END IF;

  INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at)
  VALUES (_user_id, v_phase_id, 'em_andamento', true, now())
  ON CONFLICT (user_id, phase_id) DO UPDATE
    SET status = CASE
                   WHEN public.user_phase_status.status = 'concluido' THEN 'concluido'
                   ELSE 'em_andamento'
                 END;

  PERFORM public.record_system_event(_user_id, 'checklist_item_toggled', 'checklist_item', _item_id,
    jsonb_build_object('card_id', v_card_id, 'phase_id', v_phase_id, 'completed', _completed,
      'card_completed', v_card_completed));

  RETURN jsonb_build_object(
    'card_id', v_card_id,
    'card_completed', v_card_completed,
    'done', v_done,
    'total', v_total,
    'completed', _completed
  );
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
  PERFORM public.log_system_event(_user_id, 'toggle_checklist_item', 'error', v_err_code, v_err_msg,
    jsonb_build_object('item_id', _item_id, 'completed', _completed));
  RAISE;
END;
$$;
