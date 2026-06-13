-- Replace get_phase_quiz with get_quiz
CREATE OR REPLACE FUNCTION public.get_quiz(_quiz_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_quiz record;
  v_already_passed boolean := false;
  v_questions jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT * INTO v_quiz FROM public.quiz_templates
   WHERE id = _quiz_id AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Check if already passed (using quiz_id as phase string for backwards compat or new logic)
  SELECT EXISTS(
    SELECT 1 FROM public.young_quiz_attempts
    WHERE young_id = auth.uid() AND phase = _quiz_id::text AND passed = true
  ) INTO v_already_passed;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'question', q.question,
      'type', q.type,
      'media_url', q.media_url,
      'media_type', q.media_type,
      'options', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', o.id,
            'text', o.text,
            'media_url', o.media_url,
            'media_type', o.media_type
          ) ORDER BY o.order_index
        )
        FROM public.quiz_options o WHERE o.question_id = q.id
      )
    ) ORDER BY q.order_index
  ) INTO v_questions
  FROM public.quiz_questions q
  WHERE q.quiz_id = v_quiz.id;

  RETURN jsonb_build_object(
    'id', v_quiz.id,
    'title', v_quiz.title,
    'description', v_quiz.description,
    'passing_score', v_quiz.passing_score,
    'already_passed', v_already_passed,
    'questions', COALESCE(v_questions, '[]'::jsonb)
  );
END $$;
GRANT EXECUTE ON FUNCTION public.get_quiz(uuid) TO authenticated;

-- Replace submit_phase_quiz with submit_quiz
CREATE OR REPLACE FUNCTION public.submit_quiz(_quiz_id uuid, _answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_quiz record;
  v_total int;
  v_correct int := 0;
  v_score numeric;
  v_passed boolean;
  v_attempt_number int;
  v_young_id uuid := auth.uid();
  v_ans jsonb;
  v_opt_is_correct boolean;
BEGIN
  IF v_young_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', jsonb_build_object('code', 'unauthorized', 'message', 'Não autorizado'));
  END IF;

  SELECT * INTO v_quiz FROM public.quiz_templates WHERE id = _quiz_id AND is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', jsonb_build_object('code', 'not_found', 'message', 'Quiz inativo ou não encontrado'));
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.young_quiz_attempts
    WHERE young_id = v_young_id AND phase = _quiz_id::text AND passed = true
  ) INTO v_passed;
  
  IF v_passed THEN
    RETURN jsonb_build_object(
      'success', true,
      'score', 100,
      'passed', true,
      'attempt_number', 0,
      'correct', 0,
      'total', 0,
      'passing_score', v_quiz.passing_score,
      'idempotent', true
    );
  END IF;

  SELECT count(*) INTO v_total FROM public.quiz_questions WHERE quiz_id = v_quiz.id AND type = 'multipla_escolha';
  
  FOR v_ans IN SELECT * FROM jsonb_array_elements(_answers)
  LOOP
    SELECT is_correct INTO v_opt_is_correct
    FROM public.quiz_options
    WHERE id = (v_ans->>'option_id')::uuid AND question_id = (v_ans->>'question_id')::uuid;
    
    IF v_opt_is_correct THEN
      v_correct := v_correct + 1;
    END IF;
  END LOOP;

  IF v_total = 0 THEN
    v_score := 100;
  ELSE
    v_score := (v_correct::numeric / v_total::numeric) * 100;
  END IF;

  v_passed := v_score >= v_quiz.passing_score;

  SELECT count(*) + 1 INTO v_attempt_number
  FROM public.young_quiz_attempts
  WHERE young_id = v_young_id AND phase = _quiz_id::text;

  INSERT INTO public.young_quiz_attempts (young_id, phase, score, passed, attempt_number)
  VALUES (v_young_id, _quiz_id::text, v_score, v_passed, v_attempt_number);

  -- For XP and rewards, we can emit an event here if needed, or rely on existing logic.
  IF v_passed THEN
    PERFORM public.process_xp_event(v_young_id, 'quiz_passed', _quiz_id, 100);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'score', round(v_score),
    'passed', v_passed,
    'attempt_number', v_attempt_number,
    'correct', v_correct,
    'total', v_total,
    'passing_score', v_quiz.passing_score,
    'idempotent', false
  );
END $$;
GRANT EXECUTE ON FUNCTION public.submit_quiz(uuid, jsonb) TO authenticated;
