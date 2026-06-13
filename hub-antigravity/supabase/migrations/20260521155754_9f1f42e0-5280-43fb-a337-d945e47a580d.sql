-- Seed RPC (admin only): popula catálogo se vazio
CREATE OR REPLACE FUNCTION public.seed_journey_demo()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing int;
  v_p1 uuid; v_p2 uuid; v_p3 uuid;
  v_c1 uuid; v_c2 uuid; v_c3 uuid;
  v_q1 uuid; v_q2 uuid;
  v_qq uuid;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*) INTO v_existing FROM public.journey_phase_catalog;
  IF v_existing > 0 THEN
    RETURN jsonb_build_object('seeded', false, 'reason', 'already_populated', 'phases', v_existing);
  END IF;

  -- Fase 1: Fundação
  INSERT INTO public.journey_phase_catalog (title, description, order_index, has_quiz, xp_reward)
  VALUES ('Fundação', 'Primeiros passos e boas-vindas ao MTX Hub.', 1, true, 100)
  RETURNING id INTO v_p1;

  INSERT INTO public.journey_cards (phase_id, title, description, order_index, xp_reward)
  VALUES (v_p1, 'Comece por aqui', 'Conheça o programa e configure seu perfil.', 1, 30)
  RETURNING id INTO v_c1;

  INSERT INTO public.journey_checklist_items (card_id, title, required, order_index) VALUES
    (v_c1, 'Completar o perfil', true, 1),
    (v_c1, 'Assistir ao vídeo de boas-vindas', true, 2),
    (v_c1, 'Apresentar-se no grupo', true, 3);

  INSERT INTO public.quiz_templates (phase_id, title, description, passing_score, is_active)
  VALUES (v_p1, 'Quiz da Fundação', 'Validação dos conceitos básicos.', 80, true)
  RETURNING id INTO v_q1;

  INSERT INTO public.quiz_questions (quiz_id, question, type, order_index)
  VALUES (v_q1, 'Qual o principal objetivo da fase de Fundação?', 'multiple_choice', 1)
  RETURNING id INTO v_qq;
  INSERT INTO public.quiz_options (question_id, text, is_correct, order_index) VALUES
    (v_qq, 'Conhecer o programa e se preparar', true, 1),
    (v_qq, 'Pular direto para a entrega', false, 2),
    (v_qq, 'Apenas observar', false, 3);

  -- Fase 2: Exploração
  INSERT INTO public.journey_phase_catalog (title, description, order_index, has_quiz, xp_reward)
  VALUES ('Exploração', 'Coloque a mão na massa em projetos reais.', 2, true, 200)
  RETURNING id INTO v_p2;

  INSERT INTO public.journey_cards (phase_id, title, description, order_index, xp_reward)
  VALUES (v_p2, 'Primeiros desafios', 'Execute tarefas práticas sob mentoria.', 1, 60)
  RETURNING id INTO v_c2;

  INSERT INTO public.journey_checklist_items (card_id, title, required, order_index) VALUES
    (v_c2, 'Entregar primeiro desafio prático', true, 1),
    (v_c2, 'Receber feedback do mentor', true, 2),
    (v_c2, 'Revisar e iterar a entrega', true, 3);

  INSERT INTO public.quiz_templates (phase_id, title, description, passing_score, is_active)
  VALUES (v_p2, 'Quiz da Exploração', 'Validação intermediária.', 80, true)
  RETURNING id INTO v_q2;

  INSERT INTO public.quiz_questions (quiz_id, question, type, order_index)
  VALUES (v_q2, 'Qual prática melhor descreve esta fase?', 'multiple_choice', 1)
  RETURNING id INTO v_qq;
  INSERT INTO public.quiz_options (question_id, text, is_correct, order_index) VALUES
    (v_qq, 'Executar com feedback e iterar', true, 1),
    (v_qq, 'Trabalhar sozinho sem revisão', false, 2),
    (v_qq, 'Aguardar instruções passivamente', false, 3);

  -- Fase 3: Mestria
  INSERT INTO public.journey_phase_catalog (title, description, order_index, has_quiz, xp_reward)
  VALUES ('Mestria', 'Consolide o aprendizado e lidere entregas.', 3, false, 300)
  RETURNING id INTO v_p3;

  INSERT INTO public.journey_cards (phase_id, title, description, order_index, xp_reward)
  VALUES (v_p3, 'Revisão final', 'Demonstre autonomia e domínio.', 1, 100)
  RETURNING id INTO v_c3;

  INSERT INTO public.journey_checklist_items (card_id, title, required, order_index) VALUES
    (v_c3, 'Apresentar projeto final', true, 1),
    (v_c3, 'Mentoriar um colega', true, 2);

  RETURN jsonb_build_object('seeded', true, 'phases', 3);
END;
$$;

-- Inicia a jornada do usuário autenticado
CREATE OR REPLACE FUNCTION public.start_user_journey()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_first uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT id INTO v_first FROM public.journey_phase_catalog
    ORDER BY order_index ASC LIMIT 1;
  IF v_first IS NULL THEN
    RETURN jsonb_build_object('started', false, 'reason', 'no_phases');
  END IF;

  INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at)
  VALUES (v_user, v_first, 'em_andamento', true, now())
  ON CONFLICT (user_id, phase_id) DO UPDATE
    SET status = CASE WHEN public.user_phase_status.status = 'concluido'
                      THEN 'concluido' ELSE 'em_andamento' END,
        unlocked = true,
        unlocked_at = COALESCE(public.user_phase_status.unlocked_at, now());

  RETURN jsonb_build_object('started', true, 'phase_id', v_first);
END;
$$;