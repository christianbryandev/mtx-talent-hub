-- Garante que a role authenticated tenha as permissões básicas
GRANT SELECT, INSERT, UPDATE ON public.young_people TO authenticated;
GRANT ALL ON public.young_people TO service_role;

-- Remove políticas antigas para evitar conflitos (se existirem com nomes ligeiramente diferentes)
DROP POLICY IF EXISTS "Jovens can create their own record" ON public.young_people;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.young_people;

-- Cria a política de inserção robusta
CREATE POLICY "Users can insert their own young record" 
ON public.young_people 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = profile_id);

-- Garante permissões na tabela de logs de atividade
GRANT INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

DROP POLICY IF EXISTS "Users can insert their own logs" ON public.activity_logs;
CREATE POLICY "Users can insert their own logs" 
ON public.activity_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);
