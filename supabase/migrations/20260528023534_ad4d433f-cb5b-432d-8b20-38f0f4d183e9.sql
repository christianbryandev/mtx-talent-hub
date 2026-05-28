-- Permite que usuários autenticados criem seu próprio registro de jovem se o profile_id corresponder ao seu ID
CREATE POLICY "Jovens can create their own record" 
ON public.young_people 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = profile_id);

-- Garante que as permissões de SELECT e UPDATE continuem funcionando corretamente
-- (Já existem políticas para SELECT e UPDATE baseadas em profile_id)
