-- Permitir que todos os usuários autenticados vejam os perfis para que o chat funcione corretamente
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;

CREATE POLICY "Profiles are viewable by all authenticated users" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');