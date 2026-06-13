
-- Campos ricos do card (descrição, observações, materiais, links, anexos)
ALTER TABLE public.journey_cards
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS materials text,
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- SSOT: precedência de estados da fase + dados ricos no card
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

  -- Garante a primeira fase desbloqueada
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
      'unlocked', COALESCE(ups.unlocked, false),
      'raw_status', COALESCE(ups.status, 'pendente'),
      -- Precedência: bloqueada > reprovada > aguardando_quiz > nao_iniciada > em_andamento > concluida
      'status', (
        CASE
          WHEN COALESCE(ups.unlocked, false) = false THEN 'bloqueada'
          WHEN COALESCE(ups.status,'pendente') = 'concluido' THEN 'concluida'
          WHEN ph.has_quiz
               AND (SELECT COUNT(*) FROM public.journey_cards WHERE phase_id = ph.id) > 0
               AND (SELECT COUNT(*) FROM public.user_card_progress ucp
                      JOIN public.journey_cards jc ON jc.id = ucp.card_id
                     WHERE ucp.user_id = _user_id AND jc.phase_id = ph.id AND ucp.completed = true)
                   = (SELECT COUNT(*) FROM public.journey_cards WHERE phase_id = ph.id)
               AND EXISTS (
                 SELECT 1 FROM public.journey_quiz_attempts
                  WHERE user_id = _user_id AND phase_id = ph.id AND passed = false
                  AND created_at = (SELECT MAX(created_at) FROM public.journey_quiz_attempts
                                     WHERE user_id = _user_id AND phase_id = ph.id)
               )
            THEN 'reprovada'
          WHEN ph.has_quiz
               AND (SELECT COUNT(*) FROM public.journey_cards WHERE phase_id = ph.id) > 0
               AND (SELECT COUNT(*) FROM public.user_card_progress ucp
                      JOIN public.journey_cards jc ON jc.id = ucp.card_id
                     WHERE ucp.user_id = _user_id AND jc.phase_id = ph.id AND ucp.completed = true)
                   = (SELECT COUNT(*) FROM public.journey_cards WHERE phase_id = ph.id)
            THEN 'aguardando_quiz'
          WHEN COALESCE(ups.status,'pendente') = 'em_andamento' THEN 'em_andamento'
          ELSE 'nao_iniciada'
        END
      ),
      'cards_total', (SELECT COUNT(*) FROM public.journey_cards WHERE phase_id = ph.id),
      'cards_done', (SELECT COUNT(*) FROM public.user_card_progress ucp
                     JOIN public.journey_cards jc ON jc.id = ucp.card_id
                     WHERE ucp.user_id = _user_id AND jc.phase_id = ph.id AND ucp.completed = true),
      'last_quiz_score', (SELECT score FROM public.journey_quiz_attempts
                           WHERE user_id = _user_id AND phase_id = ph.id
                           ORDER BY created_at DESC LIMIT 1),
      'cards', (
        SELECT COALESCE(jsonb_agg(c ORDER BY (c->>'order_index')::int), '[]'::jsonb)
        FROM (
          SELECT jsonb_build_object(
            'id', jc.id,
            'title', jc.title,
            'description', jc.description,
            'notes', jc.notes,
            'materials', jc.materials,
            'links', COALESCE(jc.links, '[]'::jsonb),
            'attachments', COALESCE(jc.attachments, '[]'::jsonb),
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

  RETURN v_result || jsonb_build_object(
    'total_items', v_total_items,
    'done_items', v_done_items,
    'total_xp', v_total_xp,
    'overall_progress', CASE WHEN v_total_items > 0
                             THEN ROUND((v_done_items::numeric / v_total_items::numeric) * 100)::int
                             ELSE 0 END
  );
END;
$$;
