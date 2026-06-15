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
