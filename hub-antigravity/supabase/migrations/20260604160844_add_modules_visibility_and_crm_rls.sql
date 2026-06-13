-- Adicionar novas colunas na tabela journey_modules
ALTER TABLE public.journey_modules ADD COLUMN IF NOT EXISTS visibility_type text DEFAULT 'all';
ALTER TABLE public.journey_modules ADD COLUMN IF NOT EXISTS assigned_users uuid[] DEFAULT '{}';
ALTER TABLE public.journey_modules ADD COLUMN IF NOT EXISTS supplementary_text text;

-- Atualizar RLS da tabela opportunities para o CRM Comercial
-- Deleta políticas antigas de SELECT
DROP POLICY IF EXISTS "Enable read access for all users" ON public.opportunities;
DROP POLICY IF EXISTS "Enable read for admin or assigned commercial" ON public.opportunities;

CREATE POLICY "Enable read for admin or assigned commercial"
ON public.opportunities
FOR SELECT
USING (
  (auth.uid() = commercial_responsible) OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

-- Garantir acesso para os próprios usuários em UPDATE se necessário
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.opportunities;
DROP POLICY IF EXISTS "Enable update for admin or assigned commercial" ON public.opportunities;

CREATE POLICY "Enable update for admin or assigned commercial"
ON public.opportunities
FOR UPDATE
USING (
  (auth.uid() = commercial_responsible) OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'super_admin')
  )
);
