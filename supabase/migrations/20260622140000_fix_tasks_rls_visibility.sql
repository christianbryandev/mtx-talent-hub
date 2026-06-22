-- Fix: comercial não deve ter acesso total a tasks.
-- Visibilidade baseada em vínculo: captador, responsável de serviço, ou comercial do cliente.

-- Remover policies antigas
DROP POLICY IF EXISTS "Comercial manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "colaborador_select_tasks" ON public.tasks;
DROP POLICY IF EXISTS "Colaboradores view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Colaboradores update own tasks" ON public.tasks;

-- SELECT: unificada para comercial e jovem_aprendiz
CREATE POLICY "Users select own tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.young_people yp
    WHERE yp.id = tasks.young_responsible
      AND yp.profile_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.task_services ts
    JOIN public.young_people yp ON yp.id = ts.young_responsible
    WHERE ts.task_id = tasks.id
      AND yp.profile_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = tasks.client_id
      AND c.commercial_responsible = auth.uid()
  )
);

-- UPDATE: mesma lógica (quem vê pode atualizar)
CREATE POLICY "Users update own tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.young_people yp
    WHERE yp.id = tasks.young_responsible
      AND yp.profile_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.task_services ts
    JOIN public.young_people yp ON yp.id = ts.young_responsible
    WHERE ts.task_id = tasks.id
      AND yp.profile_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = tasks.client_id
      AND c.commercial_responsible = auth.uid()
  )
);

-- INSERT: comercial e jovem_aprendiz podem criar tasks
CREATE POLICY "Users insert tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'comercial'::app_role)
  OR has_role(auth.uid(), 'jovem_aprendiz'::app_role)
);

-- DELETE: apenas admin
CREATE POLICY "Admins delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);
