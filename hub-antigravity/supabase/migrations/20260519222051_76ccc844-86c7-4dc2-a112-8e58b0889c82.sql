
-- 1. Expand services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS responsible_area text,
  ADD COLUMN IF NOT EXISTS executor_profile text,
  ADD COLUMN IF NOT EXISTS frequency text,
  ADD COLUMN IF NOT EXISTS pct_mtx numeric,
  ADD COLUMN IF NOT EXISTS pct_commercial numeric,
  ADD COLUMN IF NOT EXISTS pct_executor numeric,
  ADD COLUMN IF NOT EXISTS default_executor_id uuid;

-- 2. service_task_templates
CREATE TABLE IF NOT EXISTS public.service_task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name text NOT NULL,
  task_type text,
  responsible_area text,
  default_deadline_days integer,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stt_service ON public.service_task_templates(service_id);
ALTER TABLE public.service_task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stt_admin_all ON public.service_task_templates;
CREATE POLICY stt_admin_all ON public.service_task_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS stt_view ON public.service_task_templates;
CREATE POLICY stt_view ON public.service_task_templates
  FOR SELECT TO authenticated USING (true);

-- 3. service_onboarding_checklist
CREATE TABLE IF NOT EXISTS public.service_onboarding_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  item text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_soc_service ON public.service_onboarding_checklist(service_id);
ALTER TABLE public.service_onboarding_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS soc_admin_all ON public.service_onboarding_checklist;
CREATE POLICY soc_admin_all ON public.service_onboarding_checklist
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS soc_view ON public.service_onboarding_checklist;
CREATE POLICY soc_view ON public.service_onboarding_checklist
  FOR SELECT TO authenticated USING (true);

-- 4. client_services recurrence_paused
ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS recurrence_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS executor_id uuid;

-- 5. activate_client_service RPC
CREATE OR REPLACE FUNCTION public.activate_client_service(_client_service_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cs record;
  svc record;
  tpl record;
  v_executor uuid;
  v_count int := 0;
  v_due date;
BEGIN
  SELECT * INTO cs FROM public.client_services WHERE id = _client_service_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serviço do cliente não encontrado';
  END IF;

  SELECT * INTO svc FROM public.services WHERE id = cs.service_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serviço base não encontrado';
  END IF;

  v_executor := COALESCE(cs.executor_id, svc.default_executor_id);
  IF v_executor IS NULL THEN
    RAISE EXCEPTION 'Defina o responsável antes de ativar';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service_task_templates WHERE service_id = svc.id) THEN
    RAISE EXCEPTION 'Este serviço não tem tarefas configuradas';
  END IF;

  FOR tpl IN
    SELECT * FROM public.service_task_templates
    WHERE service_id = svc.id
    ORDER BY position, created_at
  LOOP
    v_due := COALESCE(cs.start_date, CURRENT_DATE) + COALESCE(tpl.default_deadline_days, 7);
    INSERT INTO public.tasks (
      title, description, status, kanban_column, priority,
      client_id, service_id, young_responsible, due_date, created_by
    ) VALUES (
      tpl.name,
      'Gerado a partir do template de serviço',
      'aberta', 'backlog', 'media',
      cs.client_id, svc.id, v_executor, v_due, auth.uid()
    );
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.client_services
     SET status = 'ativo',
         executor_id = v_executor,
         recurrence_paused = false
   WHERE id = _client_service_id;

  RETURN jsonb_build_object('tasks_created', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_client_service(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.activate_client_service(uuid) TO authenticated;
