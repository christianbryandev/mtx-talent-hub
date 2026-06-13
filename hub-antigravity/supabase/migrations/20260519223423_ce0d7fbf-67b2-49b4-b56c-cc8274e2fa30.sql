
-- Remove old check constraints if any
ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_type_check;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_kanban_column_check;

-- ============================================================
-- TAREFAS: reduzir Kanban para 5 colunas + novos campos
-- ============================================================
UPDATE public.tasks SET kanban_column = 'em_revisao' WHERE kanban_column = 'aguardando_cliente';
UPDATE public.tasks SET kanban_column = 'a_fazer' WHERE kanban_column = 'pausado';

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS hours_realized numeric,
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false;

UPDATE public.tasks
   SET auto_generated = true
 WHERE service_id IS NOT NULL
   AND description = 'Gerado a partir do template de serviço';

-- ============================================================
-- REUNIÕES: 4 categorias + vínculos com CRM/Cliente
-- ============================================================
UPDATE public.meetings SET type = 'formacao_mentoria'   WHERE type IN ('mentoria','geral_jovens');
UPDATE public.meetings SET type = 'checkin_operacional' WHERE type = 'operacional';
UPDATE public.meetings SET type = 'comercial_cliente'   WHERE type = 'comercial';
UPDATE public.meetings SET type = 'gestao_mtx'          WHERE type IN ('alinhamento_entrega');

-- Sanitiza qualquer tipo desconhecido
UPDATE public.meetings
   SET type = 'gestao_mtx'
 WHERE type NOT IN ('formacao_mentoria','checkin_operacional','comercial_cliente','gestao_mtx');

ALTER TABLE public.meetings
  ADD CONSTRAINT meetings_type_check
  CHECK (type IN ('formacao_mentoria','checkin_operacional','comercial_cliente','gestao_mtx'));

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS link_opportunity_id uuid,
  ADD COLUMN IF NOT EXISTS link_client_id uuid;

-- ============================================================
-- Próximos Passos da ata (com conversão em tarefa)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL,
  description text NOT NULL,
  responsible_id uuid,
  task_id uuid,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mai_admin_all" ON public.meeting_action_items;
CREATE POLICY "mai_admin_all"
ON public.meeting_action_items
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "mai_comercial_all" ON public.meeting_action_items;
CREATE POLICY "mai_comercial_all"
ON public.meeting_action_items
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'comercial'::app_role))
WITH CHECK (has_role(auth.uid(), 'comercial'::app_role));

DROP POLICY IF EXISTS "mai_participants_view" ON public.meeting_action_items;
CREATE POLICY "mai_participants_view"
ON public.meeting_action_items
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.meeting_participants mp
  WHERE mp.meeting_id = meeting_action_items.meeting_id
    AND (mp.profile_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.young_people yp WHERE yp.id = mp.young_id AND yp.profile_id = auth.uid()))
));

CREATE INDEX IF NOT EXISTS idx_mai_meeting ON public.meeting_action_items(meeting_id);
