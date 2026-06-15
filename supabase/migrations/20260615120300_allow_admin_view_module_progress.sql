-- Fix: Permitir que admins vejam o progresso de módulos de todos os usuários.
-- Sem essa policy, o ProgressMini na aba Jovens retorna 0% para todos
-- porque a RLS só permite SELECT onde auth.uid() = user_id.

CREATE POLICY "Admins can view all module progress"
ON public.user_module_progress FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);
