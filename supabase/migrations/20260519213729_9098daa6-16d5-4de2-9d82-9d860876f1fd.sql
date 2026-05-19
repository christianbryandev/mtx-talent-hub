
-- Restringir visibilidade de tarefas: somente admin/super_admin + jovem atribuído podem ver.
-- Comercial mantém poder de criar/editar/excluir tarefas que criou, mas não vê tudo.

DROP POLICY IF EXISTS "Comercial manage tasks" ON public.tasks;

CREATE POLICY "Comercial insert tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'comercial'::app_role));

CREATE POLICY "Comercial update own created tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'comercial'::app_role) AND created_by = auth.uid());

CREATE POLICY "Comercial delete own created tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'comercial'::app_role) AND created_by = auth.uid());

CREATE POLICY "Comercial view own created tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'comercial'::app_role) AND created_by = auth.uid());
