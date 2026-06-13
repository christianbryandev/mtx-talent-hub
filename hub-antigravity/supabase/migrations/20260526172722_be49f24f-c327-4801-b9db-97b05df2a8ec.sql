-- meeting_tasks
DROP POLICY IF EXISTS "Authenticated view meeting_tasks" ON public.meeting_tasks;
CREATE POLICY "Roles allowed to view meeting_tasks" 
ON public.meeting_tasks 
FOR SELECT 
TO authenticated 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'comercial'::app_role)
);

-- opportunity_services
DROP POLICY IF EXISTS "opportunity_services_select" ON public.opportunity_services;
CREATE POLICY "opportunity_services_select_restricted" 
ON public.opportunity_services 
FOR SELECT 
TO authenticated 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'comercial'::app_role)
);

-- service_young_people
DROP POLICY IF EXISTS "Authenticated view service_young_people" ON public.service_young_people;
CREATE POLICY "Roles allowed to view service_young_people" 
ON public.service_young_people 
FOR SELECT 
TO authenticated 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'comercial'::app_role)
);
