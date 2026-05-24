-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Allowed roles can view messages" ON public.chat_mensagens;

-- Create a more restrictive policy for message viewing
CREATE POLICY "Allowed roles can view messages"
ON public.chat_mensagens
FOR SELECT
TO authenticated
USING (
  -- Admins can see everything
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
  OR 
  -- Other roles can only see messages sent after their profile was created
  (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('comercial', 'colaborador')
    )
    AND 
    criado_em >= (
      SELECT created_at FROM public.profiles 
      WHERE id = auth.uid()
    )
  )
);
