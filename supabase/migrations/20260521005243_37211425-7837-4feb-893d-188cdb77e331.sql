
-- =========================================================================
-- CATÁLOGO (conteúdo da jornada)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.journey_phase_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  order_index integer NOT NULL UNIQUE,
  has_quiz boolean NOT NULL DEFAULT false,
  xp_reward integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journey_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES public.journey_phase_catalog(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  xp_reward integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journey_cards_phase ON public.journey_cards(phase_id, order_index);

CREATE TABLE IF NOT EXISTS public.journey_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.journey_cards(id) ON DELETE CASCADE,
  title text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journey_checklist_card ON public.journey_checklist_items(card_id, order_index);

-- =========================================================================
-- PROGRESSO POR USUÁRIO
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.user_checklist_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES public.journey_checklist_items(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT true,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checklist_item_id)
);
CREATE INDEX IF NOT EXISTS idx_ucp_user ON public.user_checklist_progress(user_id);

CREATE TABLE IF NOT EXISTS public.user_card_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.journey_cards(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  UNIQUE (user_id, card_id)
);
CREATE INDEX IF NOT EXISTS idx_ucardp_user ON public.user_card_progress(user_id);

CREATE TABLE IF NOT EXISTS public.user_phase_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase_id uuid NOT NULL REFERENCES public.journey_phase_catalog(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluido')),
  unlocked boolean NOT NULL DEFAULT false,
  unlocked_at timestamptz,
  completed_at timestamptz,
  UNIQUE (user_id, phase_id)
);
CREATE INDEX IF NOT EXISTS idx_ups_user ON public.user_phase_status(user_id);

CREATE TABLE IF NOT EXISTS public.journey_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase_id uuid NOT NULL REFERENCES public.journey_phase_catalog(id) ON DELETE CASCADE,
  score numeric NOT NULL CHECK (score >= 0 AND score <= 100),
  passed boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jqa_user_phase ON public.journey_quiz_attempts(user_id, phase_id);

CREATE TABLE IF NOT EXISTS public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  reference_id uuid NOT NULL,
  xp_amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_type, reference_id)
);
CREATE INDEX IF NOT EXISTS idx_xp_user ON public.xp_events(user_id);

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  xp_reward integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

-- =========================================================================
-- RLS
-- =========================================================================

ALTER TABLE public.journey_phase_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_card_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_phase_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Catálogo: leitura para autenticados, escrita apenas admin
CREATE POLICY "catalog_read_phases" ON public.journey_phase_catalog
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalog_admin_phases" ON public.journey_phase_catalog
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "catalog_read_cards" ON public.journey_cards
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalog_admin_cards" ON public.journey_cards
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "catalog_read_items" ON public.journey_checklist_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "catalog_admin_items" ON public.journey_checklist_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- Progresso por usuário
CREATE POLICY "ucp_self" ON public.user_checklist_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "ucardp_self" ON public.user_card_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- Status de fase: usuário só vê fases desbloqueadas (admin vê tudo)
CREATE POLICY "ups_self_unlocked_read" ON public.user_phase_status
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')
    OR (user_id = auth.uid())
  );
CREATE POLICY "ups_self_write" ON public.user_phase_status
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "ups_self_update" ON public.user_phase_status
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "jqa_self" ON public.journey_quiz_attempts
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "xp_self_read" ON public.xp_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "xp_self_insert" ON public.xp_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "ach_read" ON public.achievements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ach_admin" ON public.achievements
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "uach_self" ON public.user_achievements
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- =========================================================================
-- FUNÇÕES SSOT
-- =========================================================================

-- XP idempotente
CREATE OR REPLACE FUNCTION public.process_xp_event(
  _user_id uuid, _event_type text, _reference_id uuid, _xp_amount integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.xp_events (user_id, event_type, reference_id, xp_amount)
  VALUES (_user_id, _event_type, _reference_id, _xp_amount)
  ON CONFLICT (user_id, event_type, reference_id) DO NOTHING;
  RETURN FOUND;
END;
$$;

-- Marcar item do checklist (idempotente). Recalcula card e fase.
CREATE OR REPLACE FUNCTION public.mark_checklist_item(
  _user_id uuid, _item_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_card_id uuid;
  v_phase_id uuid;
  v_total int;
  v_done int;
  v_card_xp int;
  v_card_completed boolean := false;
BEGIN
  IF _user_id IS NULL OR _user_id <> auth.uid() THEN
    IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  SELECT ci.card_id, jc.phase_id, COALESCE(jc.xp_reward,0)
    INTO v_card_id, v_phase_id, v_card_xp
  FROM public.journey_checklist_items ci
  JOIN public.journey_cards jc ON jc.id = ci.card_id
  WHERE ci.id = _item_id;
  IF v_card_id IS NULL THEN RAISE EXCEPTION 'item not found'; END IF;

  INSERT INTO public.user_checklist_progress (user_id, checklist_item_id)
  VALUES (_user_id, _item_id)
  ON CONFLICT (user_id, checklist_item_id) DO NOTHING;

  -- Recalcular card
  SELECT COUNT(*) INTO v_total FROM public.journey_checklist_items
    WHERE card_id = v_card_id AND required = true;
  SELECT COUNT(*) INTO v_done FROM public.user_checklist_progress ucp
    JOIN public.journey_checklist_items ci ON ci.id = ucp.checklist_item_id
    WHERE ucp.user_id = _user_id AND ci.card_id = v_card_id AND ci.required = true;

  IF v_total > 0 AND v_done >= v_total THEN
    INSERT INTO public.user_card_progress (user_id, card_id, completed, completed_at)
    VALUES (_user_id, v_card_id, true, now())
    ON CONFLICT (user_id, card_id) DO UPDATE SET completed = true, completed_at = COALESCE(public.user_card_progress.completed_at, now());
    v_card_completed := true;
    PERFORM public.process_xp_event(_user_id, 'card_completed', v_card_id, v_card_xp);
  END IF;

  -- Atualizar status da fase para em_andamento
  INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at)
  VALUES (_user_id, v_phase_id, 'em_andamento', true, now())
  ON CONFLICT (user_id, phase_id) DO UPDATE
    SET status = CASE WHEN public.user_phase_status.status = 'concluido' THEN 'concluido' ELSE 'em_andamento' END;

  RETURN jsonb_build_object('card_id', v_card_id, 'card_completed', v_card_completed, 'done', v_done, 'total', v_total);
END;
$$;

-- Submissão de quiz (transacional). Avança a fase se score >= 80 e todos os cards concluídos.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  _user_id uuid, _phase_id uuid, _score numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_passed boolean;
  v_attempt_id uuid;
  v_cards_total int;
  v_cards_done int;
  v_phase_xp int;
  v_next_phase_id uuid;
  v_phase_completed boolean := false;
BEGIN
  IF _user_id IS NULL OR _user_id <> auth.uid() THEN
    IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  v_passed := _score >= 80;

  INSERT INTO public.journey_quiz_attempts (user_id, phase_id, score, passed)
  VALUES (_user_id, _phase_id, _score, v_passed)
  RETURNING id INTO v_attempt_id;

  SELECT COUNT(*) INTO v_cards_total FROM public.journey_cards WHERE phase_id = _phase_id;
  SELECT COUNT(*) INTO v_cards_done FROM public.user_card_progress ucp
    JOIN public.journey_cards jc ON jc.id = ucp.card_id
    WHERE ucp.user_id = _user_id AND jc.phase_id = _phase_id AND ucp.completed = true;

  IF v_passed AND v_cards_done >= v_cards_total AND v_cards_total > 0 THEN
    UPDATE public.user_phase_status
       SET status = 'concluido', completed_at = COALESCE(completed_at, now())
     WHERE user_id = _user_id AND phase_id = _phase_id;
    v_phase_completed := true;
    SELECT COALESCE(xp_reward,0) INTO v_phase_xp FROM public.journey_phase_catalog WHERE id = _phase_id;
    PERFORM public.process_xp_event(_user_id, 'phase_completed', _phase_id, v_phase_xp);

    -- Desbloquear próxima
    SELECT id INTO v_next_phase_id FROM public.journey_phase_catalog
     WHERE order_index = (SELECT order_index + 1 FROM public.journey_phase_catalog WHERE id = _phase_id);
    IF v_next_phase_id IS NOT NULL THEN
      INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at)
      VALUES (_user_id, v_next_phase_id, 'pendente', true, now())
      ON CONFLICT (user_id, phase_id) DO UPDATE
        SET unlocked = true, unlocked_at = COALESCE(public.user_phase_status.unlocked_at, now());
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'passed', v_passed,
    'phase_completed', v_phase_completed,
    'next_phase_id', v_next_phase_id
  );
END;
$$;

-- Retorna a jornada completa do usuário
CREATE OR REPLACE FUNCTION public.get_user_journey(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
  v_total_items int;
  v_done_items int;
  v_total_xp int;
BEGIN
  IF _user_id IS NULL OR (_user_id <> auth.uid()
     AND NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Garante que a primeira fase esteja desbloqueada
  INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at)
  SELECT _user_id, id, 'pendente', true, now()
    FROM public.journey_phase_catalog
   WHERE order_index = (SELECT MIN(order_index) FROM public.journey_phase_catalog)
  ON CONFLICT DO NOTHING;

  SELECT jsonb_build_object(
    'phases', COALESCE(jsonb_agg(p ORDER BY (p->>'order_index')::int), '[]'::jsonb)
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', ph.id,
      'title', ph.title,
      'description', ph.description,
      'order_index', ph.order_index,
      'has_quiz', ph.has_quiz,
      'xp_reward', ph.xp_reward,
      'status', COALESCE(ups.status, 'pendente'),
      'unlocked', COALESCE(ups.unlocked, false),
      'cards_total', (SELECT COUNT(*) FROM public.journey_cards WHERE phase_id = ph.id),
      'cards_done', (SELECT COUNT(*) FROM public.user_card_progress ucp
                     JOIN public.journey_cards jc ON jc.id = ucp.card_id
                     WHERE ucp.user_id = _user_id AND jc.phase_id = ph.id AND ucp.completed = true),
      'cards', (
        SELECT COALESCE(jsonb_agg(c ORDER BY (c->>'order_index')::int), '[]'::jsonb)
        FROM (
          SELECT jsonb_build_object(
            'id', jc.id,
            'title', jc.title,
            'description', jc.description,
            'order_index', jc.order_index,
            'xp_reward', jc.xp_reward,
            'completed', COALESCE(ucp.completed, false),
            'items', (
              SELECT COALESCE(jsonb_agg(i ORDER BY (i->>'order_index')::int), '[]'::jsonb)
              FROM (
                SELECT jsonb_build_object(
                  'id', ci.id,
                  'title', ci.title,
                  'required', ci.required,
                  'order_index', ci.order_index,
                  'completed', (uci.checklist_item_id IS NOT NULL)
                ) AS i
                FROM public.journey_checklist_items ci
                LEFT JOIN public.user_checklist_progress uci
                  ON uci.checklist_item_id = ci.id AND uci.user_id = _user_id
                WHERE ci.card_id = jc.id
              ) sub
            )
          ) AS c
          FROM public.journey_cards jc
          LEFT JOIN public.user_card_progress ucp ON ucp.card_id = jc.id AND ucp.user_id = _user_id
          WHERE jc.phase_id = ph.id
        ) sub
      )
    ) AS p
    FROM public.journey_phase_catalog ph
    LEFT JOIN public.user_phase_status ups ON ups.phase_id = ph.id AND ups.user_id = _user_id
  ) phases;

  SELECT COUNT(*) INTO v_total_items FROM public.journey_checklist_items WHERE required = true;
  SELECT COUNT(*) INTO v_done_items FROM public.user_checklist_progress ucp
    JOIN public.journey_checklist_items ci ON ci.id = ucp.checklist_item_id
    WHERE ucp.user_id = _user_id AND ci.required = true;
  SELECT COALESCE(SUM(xp_amount),0) INTO v_total_xp FROM public.xp_events WHERE user_id = _user_id;

  v_result := v_result || jsonb_build_object(
    'overall_progress', CASE WHEN v_total_items > 0 THEN ROUND((v_done_items::numeric / v_total_items) * 100) ELSE 0 END,
    'total_xp', v_total_xp,
    'total_items', v_total_items,
    'done_items', v_done_items
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_journey(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_checklist_item(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_xp_event(uuid, text, uuid, integer) TO authenticated;
