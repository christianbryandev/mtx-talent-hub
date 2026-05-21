
CREATE OR REPLACE FUNCTION public.toggle_checklist_item(
  _user_id uuid,
  _item_id uuid,
  _completed boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  IF _completed THEN
    -- Marcar: idempotente
    INSERT INTO public.user_checklist_progress (user_id, checklist_item_id)
    VALUES (_user_id, _item_id)
    ON CONFLICT (user_id, checklist_item_id) DO NOTHING;
  ELSE
    -- Desmarcar: remove apenas o progresso. XP NÃO é revertido.
    DELETE FROM public.user_checklist_progress
    WHERE user_id = _user_id AND checklist_item_id = _item_id;
  END IF;

  -- Recalcular completude do card
  SELECT COUNT(*) INTO v_total FROM public.journey_checklist_items
    WHERE card_id = v_card_id AND required = true;
  SELECT COUNT(*) INTO v_done FROM public.user_checklist_progress ucp
    JOIN public.journey_checklist_items ci ON ci.id = ucp.checklist_item_id
    WHERE ucp.user_id = _user_id AND ci.card_id = v_card_id AND ci.required = true;

  IF v_total > 0 AND v_done >= v_total THEN
    -- Card completo: marca progresso e concede XP (idempotente via unique em xp_events)
    INSERT INTO public.user_card_progress (user_id, card_id, completed, completed_at)
    VALUES (_user_id, v_card_id, true, now())
    ON CONFLICT (user_id, card_id) DO UPDATE
      SET completed = true,
          completed_at = COALESCE(public.user_card_progress.completed_at, now());
    v_card_completed := true;
    -- process_xp_event usa ON CONFLICT DO NOTHING → nunca duplica
    PERFORM public.process_xp_event(_user_id, 'card_completed', v_card_id, v_card_xp);
  ELSE
    -- Card deixou de estar completo (após desmarcar): atualiza progresso mas mantém XP histórico
    UPDATE public.user_card_progress
       SET completed = false
     WHERE user_id = _user_id AND card_id = v_card_id;
  END IF;

  -- Status da fase: mantém 'concluido' se já concluída; senão em_andamento
  INSERT INTO public.user_phase_status (user_id, phase_id, status, unlocked, unlocked_at)
  VALUES (_user_id, v_phase_id, 'em_andamento', true, now())
  ON CONFLICT (user_id, phase_id) DO UPDATE
    SET status = CASE
                   WHEN public.user_phase_status.status = 'concluido' THEN 'concluido'
                   ELSE 'em_andamento'
                 END;

  RETURN jsonb_build_object(
    'card_id', v_card_id,
    'card_completed', v_card_completed,
    'done', v_done,
    'total', v_total,
    'completed', _completed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_checklist_item(uuid, uuid, boolean) TO authenticated;
