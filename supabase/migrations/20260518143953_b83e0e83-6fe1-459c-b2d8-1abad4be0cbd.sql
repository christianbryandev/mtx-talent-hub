
-- ============== SERVICES extension ==============
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS deliverables text,
  ADD COLUMN IF NOT EXISTS average_deadline integer,
  ADD COLUMN IF NOT EXISTS billing_model text,
  ADD COLUMN IF NOT EXISTS default_value numeric(10,2),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo';

-- ============== SERVICE_YOUNG_PEOPLE ==============
CREATE TABLE IF NOT EXISTS public.service_young_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  young_id uuid NOT NULL REFERENCES public.young_people(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_id, young_id)
);
ALTER TABLE public.service_young_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage service_young_people" ON public.service_young_people
  FOR ALL USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'));

CREATE POLICY "Authenticated view service_young_people" ON public.service_young_people
  FOR SELECT TO authenticated USING (true);

-- ============== TASKS ==============
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  young_responsible uuid REFERENCES public.young_people(id) ON DELETE SET NULL,
  supervisor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  kanban_column text NOT NULL DEFAULT 'backlog'
    CHECK (kanban_column IN ('backlog','a_fazer','em_andamento','em_revisao','aguardando_cliente','concluido','pausado')),
  position integer NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa','media','alta','urgente')),
  due_date date,
  estimated_hours numeric(5,2),
  status text NOT NULL DEFAULT 'aberta',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tasks_kanban ON public.tasks(kanban_column, position);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_young ON public.tasks(young_responsible);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tasks" ON public.tasks
  FOR ALL USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'));

CREATE POLICY "Comercial manage tasks" ON public.tasks
  FOR ALL USING (has_role(auth.uid(),'comercial'))
  WITH CHECK (has_role(auth.uid(),'comercial'));

CREATE POLICY "Colaboradores view own tasks" ON public.tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.young_people yp
            WHERE yp.id = tasks.young_responsible AND yp.profile_id = auth.uid())
  );

CREATE POLICY "Colaboradores update own tasks" ON public.tasks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.young_people yp
            WHERE yp.id = tasks.young_responsible AND yp.profile_id = auth.uid())
  );

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== TASK_CHECKLISTS ==============
CREATE TABLE IF NOT EXISTS public.task_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  item text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_checklists_task ON public.task_checklists(task_id);

ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage checklists" ON public.task_checklists
  FOR ALL USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'));

CREATE POLICY "Comercial manage checklists" ON public.task_checklists
  FOR ALL USING (has_role(auth.uid(),'comercial'))
  WITH CHECK (has_role(auth.uid(),'comercial'));

CREATE POLICY "Colaborador manage own checklists" ON public.task_checklists
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tasks t JOIN public.young_people yp ON yp.id = t.young_responsible
            WHERE t.id = task_checklists.task_id AND yp.profile_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks t JOIN public.young_people yp ON yp.id = t.young_responsible
            WHERE t.id = task_checklists.task_id AND yp.profile_id = auth.uid())
  );

-- ============== TASK_COMMENTS ==============
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage comments" ON public.task_comments
  FOR ALL USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'));

CREATE POLICY "Comercial manage comments" ON public.task_comments
  FOR ALL USING (has_role(auth.uid(),'comercial'))
  WITH CHECK (has_role(auth.uid(),'comercial'));

CREATE POLICY "Authenticated view comments of accessible tasks" ON public.task_comments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tasks t JOIN public.young_people yp ON yp.id = t.young_responsible
            WHERE t.id = task_comments.task_id AND yp.profile_id = auth.uid())
  );

CREATE POLICY "Colaborador insert comments on own tasks" ON public.task_comments
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM public.tasks t JOIN public.young_people yp ON yp.id = t.young_responsible
            WHERE t.id = task_comments.task_id AND yp.profile_id = auth.uid())
  );

-- ============== TASK_ATTACHMENTS ==============
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name text,
  file_url text,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.task_attachments(task_id);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage attachments" ON public.task_attachments
  FOR ALL USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'));

CREATE POLICY "Comercial manage attachments" ON public.task_attachments
  FOR ALL USING (has_role(auth.uid(),'comercial'))
  WITH CHECK (has_role(auth.uid(),'comercial'));

CREATE POLICY "Colaborador manage attachments of own tasks" ON public.task_attachments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tasks t JOIN public.young_people yp ON yp.id = t.young_responsible
            WHERE t.id = task_attachments.task_id AND yp.profile_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tasks t JOIN public.young_people yp ON yp.id = t.young_responsible
            WHERE t.id = task_attachments.task_id AND yp.profile_id = auth.uid())
  );

-- ============== STORAGE BUCKET ==============
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments','task-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated read task attachments" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated upload task attachments" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated delete own task attachments" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'task-attachments' AND auth.uid() = owner);

-- ============== SEED SERVICES ==============
INSERT INTO public.services (name, category, billing_model, status, is_active) VALUES
  ('Social Media','Marketing','mensal','ativo',true),
  ('Gestão de Tráfego','Marketing','mensal','ativo',true),
  ('Design Gráfico','Design','por_entrega','ativo',true),
  ('Copywriting','Conteúdo','por_entrega','ativo',true),
  ('Comercial e Vendas','Vendas','mensal','ativo',true),
  ('CRM e Processos Comerciais','Vendas','pontual','ativo',true),
  ('E-commerce','Tecnologia','pontual','ativo',true),
  ('Criação de Sites','Tecnologia','pontual','ativo',true),
  ('Criação de Aplicativos','Tecnologia','pontual','ativo',true),
  ('Branding','Design','pontual','ativo',true),
  ('Consultoria com Rogério','Consultoria','pontual','ativo',true)
ON CONFLICT DO NOTHING;
