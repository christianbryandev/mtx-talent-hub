-- 1. Enforce ONE quiz per phase
-- Drop the existing partial index if it exists
DROP INDEX IF EXISTS public.quiz_templates_one_active_per_phase;

-- Add strict unique constraint on phase_id
-- This ensures only one quiz record can exist for a given phase
ALTER TABLE public.quiz_templates 
ADD CONSTRAINT quiz_templates_phase_id_key UNIQUE (phase_id);

-- 2. Ensure only ONE correct option per question
-- Using a partial unique index to allow multiple false options but only one true option per question
CREATE UNIQUE INDEX IF NOT EXISTS quiz_options_one_correct_per_question 
ON public.quiz_options (question_id) 
WHERE (is_correct = true);

-- 3. Improve attempts tracking
-- Ensure index on (user_id, phase_id) exists for performance
DROP INDEX IF EXISTS public.idx_jqa_user_phase;
CREATE INDEX idx_jqa_user_phase ON public.journey_quiz_attempts (user_id, phase_id);

-- 4. Update submit_phase_quiz with extra safeguards
CREATE OR REPLACE FUNCTION public.submit_phase_quiz(_phase_id uuid, _answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
  v_quiz_count int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  -- Safety check: ensure only one active quiz exists for the phase
  SELECT COUNT(*) INTO v_quiz_count FROM public.quiz_templates WHERE phase_id = _phase_id AND is_active = true;
  IF v_quiz_count > 1 THEN 
    RAISE EXCEPTION 'multiple_active_quizzes_found'; 
  END IF;

  -- Get the active quiz
  SELECT * INTO v_quiz FROM public.quiz_templates
   WHERE phase_id = _phase_id AND is_active = true;
   
  IF NOT FOUND THEN RAISE EXCEPTION 'no_active_quiz'; END IF;

  -- Prevent duplicate pass attempts
  IF EXISTS(SELECT 1 FROM public.journey_quiz_attempts
             WHERE user_id = auth.uid() AND quiz_id = v_quiz.id AND passed = true) THEN
    RAISE EXCEPTION 'already_passed';
  END IF;

  -- Verify questions exist
  SELECT COUNT(*) INTO v_total FROM public.quiz_questions WHERE quiz_id = v_quiz.id;
  IF v_total = 0 THEN RAISE EXCEPTION 'quiz_has_no_questions'; END IF;

  -- Calculate correct answers
  SELECT COUNT(*) INTO v_correct
  FROM jsonb_array_elements(_answers) a
  JOIN public.quiz_options qo ON qo.id = (a->>'option_id')::uuid
  JOIN public.quiz_questions qq ON qq.id = qo.question_id
  WHERE qq.quiz_id = v_quiz.id
    AND qq.id = (a->>'question_id')::uuid
    AND qo.is_correct = true;

  -- Calculate score and check if passed
  v_score := ROUND((v_correct::numeric / v_total::numeric) * 100, 2);
  v_passed := v_score >= v_quiz.passing_score;

  -- Record attempt
  SELECT COALESCE(MAX(attempt_number),0)+1 INTO v_attempt_number
    FROM public.journey_quiz_attempts
   WHERE user_id = auth.uid() AND quiz_id = v_quiz.id;

  INSERT INTO public.journey_quiz_attempts (user_id, phase_id, quiz_id, score, passed, attempt_number)
  VALUES (auth.uid(), _phase_id, v_quiz.id, v_score, v_passed, v_attempt_number);

  -- Process phase completion if passed
  IF v_passed THEN
    SELECT COUNT(*) INTO v_cards_total FROM public.journey_cards WHERE phase_id = _phase_id;
    SELECT COUNT(*) INTO v_cards_done FROM public.user_card_progress ucp
      JOIN public.journey_cards jc ON jc.id = ucp.card_id
     WHERE ucp.user_id = auth.uid() AND jc.phase_id = _phase_id AND ucp.completed = true;

    -- If all cards are done, mark phase as complete and unlock next
    IF v_cards_total = 0 OR v_cards_done >= v_cards_total THEN
      INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at, completed_at)
      VALUES (auth.uid(), _phase_id, 'concluido', true, now(), now())
      ON CONFLICT (user_id, phase_id) DO UPDATE
        SET status = 'concluido',
            completed_at = COALESCE(public.user_phase_status.completed_at, now());

      -- Award XP
      SELECT COALESCE(xp_reward,0) INTO v_phase_xp FROM public.journey_phase_catalog WHERE id = _phase_id;
      PERFORM public.process_xp_event(auth.uid(), 'phase_completed', _phase_id, v_phase_xp);

      -- Unlock next phase
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
$function$;
