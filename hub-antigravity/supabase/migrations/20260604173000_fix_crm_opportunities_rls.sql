-- Fix RLS policies to ensure commercial_responsible can reliably update opportunities
DROP POLICY IF EXISTS "Enable update for admin or assigned commercial" ON public.opportunities;

CREATE POLICY "Enable update for admin or assigned commercial"
ON public.opportunities
FOR UPDATE
USING (
  (auth.uid() = commercial_responsible) OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'super_admin', 'comercial')
  )
)
WITH CHECK (
  (auth.uid() = commercial_responsible) OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'super_admin', 'comercial')
  )
);

-- Ensure activity logs can be inserted
DROP POLICY IF EXISTS "Users can insert activity logs" ON public.activity_logs;
CREATE POLICY "Users can insert activity logs" 
ON public.activity_logs
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);
