-- Multi-service per task: junction table
CREATE TABLE IF NOT EXISTS public.task_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  young_responsible uuid REFERENCES public.young_people(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_task_services_task ON public.task_services(task_id);
CREATE INDEX IF NOT EXISTS idx_task_services_young ON public.task_services(young_responsible);

-- Add optional task_service_id to checklists and comments for per-service grouping
ALTER TABLE public.task_checklists
  ADD COLUMN IF NOT EXISTS task_service_id uuid REFERENCES public.task_services(id) ON DELETE CASCADE;

ALTER TABLE public.task_comments
  ADD COLUMN IF NOT EXISTS task_service_id uuid REFERENCES public.task_services(id) ON DELETE CASCADE;

-- RLS
ALTER TABLE public.task_services ENABLE ROW LEVEL SECURITY;

-- Admin/Comercial: full access
CREATE POLICY "admin_full_task_services" ON public.task_services
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'comercial')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'comercial')
  );

-- Jovem: can see own task_services
CREATE POLICY "jovem_select_own_task_services" ON public.task_services
  FOR SELECT TO authenticated
  USING (
    young_responsible = (SELECT id FROM public.young_people WHERE profile_id = auth.uid() LIMIT 1)
  );

-- Jovem: can update own task_services
CREATE POLICY "jovem_update_own_task_services" ON public.task_services
  FOR UPDATE TO authenticated
  USING (
    young_responsible = (SELECT id FROM public.young_people WHERE profile_id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    young_responsible = (SELECT id FROM public.young_people WHERE profile_id = auth.uid() LIMIT 1)
  );

-- Update tasks RLS: jovem can also see tasks where they have a task_service
DROP POLICY IF EXISTS "colaborador_select_tasks" ON public.tasks;
CREATE POLICY "colaborador_select_tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'comercial')
    OR young_responsible = (SELECT id FROM public.young_people WHERE profile_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM public.task_services ts
      WHERE ts.task_id = id
        AND ts.young_responsible = (SELECT id FROM public.young_people WHERE profile_id = auth.uid() LIMIT 1)
    )
  );
