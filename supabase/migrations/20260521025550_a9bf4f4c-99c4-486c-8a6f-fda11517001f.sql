
-- ============ Tables ============
CREATE TABLE public.quiz_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES public.journey_phase_catalog(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  passing_score int NOT NULL DEFAULT 80,
  is_active boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX quiz_templates_one_active_per_phase
  ON public.quiz_templates(phase_id) WHERE is_active;

CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quiz_templates(id) ON DELETE CASCADE,
  question text NOT NULL,
  type text NOT NULL DEFAULT 'multiple_choice',
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Extend existing attempts table
ALTER TABLE public.journey_quiz_attempts
  ADD COLUMN IF NOT EXISTS quiz_id uuid REFERENCES public.quiz_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attempt_number int NOT NULL DEFAULT 1;

-- ============ RLS ============
ALTER TABLE public.quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options   ENABLE ROW LEVEL SECURITY;

CREATE POLICY quiz_templates_read ON public.quiz_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY quiz_templates_admin ON public.quiz_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY quiz_questions_read ON public.quiz_questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY quiz_questions_admin ON public.quiz_questions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY quiz_options_read ON public.quiz_options
  FOR SELECT TO authenticated USING (true);
CREATE POLICY quiz_options_admin ON public.quiz_options
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- ============ RPC: get_phase_quiz ============
CREATE OR REPLACE FUNCTION public.get_phase_quiz(_phase_id uuid)
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
   WHERE phase_id = _phase_id AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.journey_quiz_attempts
     WHERE user_id = auth.uid() AND quiz_id = v_quiz.id AND passed = true
  ) INTO v_already_passed;

  SELECT COALESCE(jsonb_agg(q ORDER BY (q->>'order_index')::int), '[]'::jsonb) INTO v_questions
  FROM (
    SELECT jsonb_build_object(
      'id', qq.id,
      'question', qq.question,
      'type', qq.type,
      'order_index', qq.order_index,
      'options', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'id', qo.id, 'text', qo.text, 'order_index', qo.order_index
        ) ORDER BY qo.order_index), '[]'::jsonb)
        FROM public.quiz_options qo WHERE qo.question_id = qq.id
      )
    ) AS q
    FROM public.quiz_questions qq WHERE qq.quiz_id = v_quiz.id
  ) s;

  RETURN jsonb_build_object(
    'id', v_quiz.id,
    'phase_id', v_quiz.phase_id,
    'title', v_quiz.title,
    'description', v_quiz.description,
    'passing_score', v_quiz.passing_score,
    'version', v_quiz.version,
    'already_passed', v_already_passed,
    'questions', v_questions
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_phase_quiz(uuid) TO authenticated;

-- ============ RPC: submit_phase_quiz ============
CREATE OR REPLACE FUNCTION public.submit_phase_quiz(_phase_id uuid, _answers jsonb)
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
  v_next_phase_id uuid;
  v_phase_xp int;
  v_cards_total int;
  v_cards_done int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT * INTO v_quiz FROM public.quiz_templates
   WHERE phase_id = _phase_id AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'no_active_quiz'; END IF;

  IF EXISTS(SELECT 1 FROM public.journey_quiz_attempts
             WHERE user_id = auth.uid() AND quiz_id = v_quiz.id AND passed = true) THEN
    RAISE EXCEPTION 'already_passed';
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.quiz_questions WHERE quiz_id = v_quiz.id;
  IF v_total = 0 THEN RAISE EXCEPTION 'quiz_has_no_questions'; END IF;

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
   WHERE user_id = auth.uid() AND quiz_id = v_quiz.id;

  INSERT INTO public.journey_quiz_attempts (user_id, phase_id, quiz_id, score, passed, attempt_number)
  VALUES (auth.uid(), _phase_id, v_quiz.id, v_score, v_passed, v_attempt_number);

  IF v_passed THEN
    SELECT COUNT(*) INTO v_cards_total FROM public.journey_cards WHERE phase_id = _phase_id;
    SELECT COUNT(*) INTO v_cards_done FROM public.user_card_progress ucp
      JOIN public.journey_cards jc ON jc.id = ucp.card_id
     WHERE ucp.user_id = auth.uid() AND jc.phase_id = _phase_id AND ucp.completed = true;

    IF v_cards_total = 0 OR v_cards_done >= v_cards_total THEN
      INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at, completed_at)
      VALUES (auth.uid(), _phase_id, 'concluido', true, now(), now())
      ON CONFLICT (user_id, phase_id) DO UPDATE
        SET status = 'concluido',
            completed_at = COALESCE(public.user_phase_status.completed_at, now());

      SELECT COALESCE(xp_reward,0) INTO v_phase_xp FROM public.journey_phase_catalog WHERE id = _phase_id;
      PERFORM public.process_xp_event(auth.uid(), 'phase_completed', _phase_id, v_phase_xp);

      SELECT id INTO v_next_phase_id FROM public.journey_phase_catalog
       WHERE order_index = (SELECT order_index + 1 FROM public.journey_phase_catalog WHERE id = _phase_id);
      IF v_next_phase_id IS NOT NULL THEN
        INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at)
        VALUES (auth.uid(), v_next_phase_id, 'pendente', true, now())
        ON CONFLICT (user_id, phase_id) DO UPDATE
          SET unlocked = true, unlocked_at = COALESCE(public.user_phase_status.unlocked_at, now());
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'score', v_score,
    'passed', v_passed,
    'attempt_number', v_attempt_number,
    'correct', v_correct,
    'total', v_total,
    'passing_score', v_quiz.passing_score
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_phase_quiz(uuid, jsonb) TO authenticated;
