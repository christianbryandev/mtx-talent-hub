-- Helper: notify all users with admin or super_admin role
CREATE OR REPLACE FUNCTION public.notify_admins(
  _title text,
  _message text,
  _type text,
  _entity_type text,
  _entity_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  SELECT ur.user_id, _title, _message, _type, _entity_type, _entity_id
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'super_admin');
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_roles(
  _roles app_role[],
  _title text,
  _message text,
  _type text,
  _entity_type text,
  _entity_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  SELECT DISTINCT ur.user_id, _title, _message, _type, _entity_type, _entity_id
  FROM public.user_roles ur
  WHERE ur.role = ANY(_roles);
END;
$$;

-- 1. Task assigned
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.young_responsible IS NOT NULL THEN
    SELECT profile_id INTO v_user_id FROM public.young_people WHERE id = NEW.young_responsible;
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
      VALUES (v_user_id, 'Nova tarefa atribuída', NEW.title, 'tarefa_atribuida', 'task', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assigned ON public.tasks;
CREATE TRIGGER trg_notify_task_assigned
AFTER INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

-- 2. Task status changed
CREATE OR REPLACE FUNCTION public.notify_task_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.young_responsible IS NOT NULL THEN
    SELECT profile_id INTO v_user_id FROM public.young_people WHERE id = NEW.young_responsible;
    IF v_user_id IS NOT NULL AND v_user_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
      VALUES (v_user_id, 'Status da tarefa alterado',
        NEW.title || ' → ' || NEW.status, 'status_alterado', 'task', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_status ON public.tasks;
CREATE TRIGGER trg_notify_task_status
AFTER UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_status_changed();

-- 3. New young application
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_admins(
    'Nova inscrição de jovem',
    NEW.full_name,
    'nova_inscricao',
    'young_application',
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_application ON public.young_applications;
CREATE TRIGGER trg_notify_new_application
AFTER INSERT ON public.young_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_new_application();

-- 4. Briefing submitted
CREATE OR REPLACE FUNCTION public.notify_briefing_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_roles(
    ARRAY['admin','super_admin','comercial']::app_role[],
    'Briefing preenchido',
    COALESCE(NEW.company_name, NEW.contact_name, 'Cliente'),
    'briefing_preenchido',
    'client_briefing',
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_briefing ON public.client_briefings;
CREATE TRIGGER trg_notify_briefing
AFTER INSERT ON public.client_briefings
FOR EACH ROW EXECUTE FUNCTION public.notify_briefing_submitted();

-- 5. New opportunity
CREATE OR REPLACE FUNCTION public.notify_new_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_roles(
    ARRAY['admin','super_admin','comercial']::app_role[],
    'Nova oportunidade',
    NEW.company_name,
    'nova_oportunidade',
    'opportunity',
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_opportunity ON public.opportunities;
CREATE TRIGGER trg_notify_new_opportunity
AFTER INSERT ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.notify_new_opportunity();

-- 6. Opportunity won → client converted
CREATE OR REPLACE FUNCTION public.notify_opportunity_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ganha' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.notify_roles(
      ARRAY['admin','super_admin','comercial']::app_role[],
      'Cliente convertido 🎉',
      NEW.company_name || ' foi convertido em cliente',
      'cliente_convertido',
      'opportunity',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_opp_won ON public.opportunities;
CREATE TRIGGER trg_notify_opp_won
AFTER UPDATE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.notify_opportunity_won();

-- 7. Meeting participants → notify on insert
CREATE OR REPLACE FUNCTION public.notify_meeting_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_title text;
  v_date date;
BEGIN
  SELECT title, date INTO v_title, v_date FROM public.meetings WHERE id = NEW.meeting_id;

  IF NEW.profile_id IS NOT NULL THEN
    v_user_id := NEW.profile_id;
  ELSIF NEW.young_id IS NOT NULL THEN
    SELECT profile_id INTO v_user_id FROM public.young_people WHERE id = NEW.young_id;
  END IF;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (v_user_id, 'Reunião agendada',
      COALESCE(v_title, 'Reunião') || ' em ' || to_char(v_date, 'DD/MM/YYYY'),
      'reuniao_agendada', 'meeting', NEW.meeting_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_meeting_participant ON public.meeting_participants;
CREATE TRIGGER trg_notify_meeting_participant
AFTER INSERT ON public.meeting_participants
FOR EACH ROW EXECUTE FUNCTION public.notify_meeting_participant();

-- 8. Daily job: overdue tasks, near-due tasks, late follow-ups, cleanup
CREATE OR REPLACE FUNCTION public.daily_notifications_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Overdue tasks (due_date < today, not done)
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  SELECT yp.profile_id,
         'Tarefa atrasada',
         t.title || ' venceu em ' || to_char(t.due_date, 'DD/MM/YYYY'),
         'tarefa_atrasada', 'task', t.id
  FROM public.tasks t
  JOIN public.young_people yp ON yp.id = t.young_responsible
  WHERE t.due_date < CURRENT_DATE
    AND t.status NOT IN ('concluida','cancelada')
    AND yp.profile_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.entity_id = t.id AND n.type = 'tarefa_atrasada'
        AND n.created_at::date = CURRENT_DATE
    );

  -- Tasks due in next 2 days
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  SELECT yp.profile_id,
         'Prazo próximo',
         t.title || ' vence em ' || to_char(t.due_date, 'DD/MM/YYYY'),
         'prazo_proximo', 'task', t.id
  FROM public.tasks t
  JOIN public.young_people yp ON yp.id = t.young_responsible
  WHERE t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days'
    AND t.status NOT IN ('concluida','cancelada')
    AND yp.profile_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.entity_id = t.id AND n.type = 'prazo_proximo'
        AND n.created_at::date = CURRENT_DATE
    );

  -- Late follow-ups on opportunities
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  SELECT DISTINCT ur.user_id,
         'Follow-up atrasado',
         o.company_name || ' previsto para ' || to_char(o.next_followup_date, 'DD/MM/YYYY'),
         'followup_atrasado', 'opportunity', o.id
  FROM public.opportunities o
  CROSS JOIN public.user_roles ur
  WHERE o.next_followup_date < CURRENT_DATE
    AND o.status = 'aberta'
    AND ur.role IN ('admin','super_admin','comercial')
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.entity_id = o.id AND n.type = 'followup_atrasado'
        AND n.user_id = ur.user_id
        AND n.created_at::date = CURRENT_DATE
    );

  -- Cleanup: read notifications older than 30 days
  DELETE FROM public.notifications
  WHERE read = true AND created_at < now() - INTERVAL '30 days';
END;
$$;

-- Schedule the daily job at 08:00 UTC
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-notifications-job');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'daily-notifications-job',
  '0 8 * * *',
  $$ SELECT public.daily_notifications_job(); $$
);