-- 1) young_applications: remove overly-permissive policies that applied to ALL authenticated users
DROP POLICY IF EXISTS "Allow admins to view everything" ON public.young_applications;
DROP POLICY IF EXISTS "Allow admins to update" ON public.young_applications;

-- Recreate proper admin-scoped policies (idempotent guards)
DROP POLICY IF EXISTS "Admins select young_applications" ON public.young_applications;
CREATE POLICY "Admins select young_applications" ON public.young_applications
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update young_applications" ON public.young_applications;
CREATE POLICY "Admins update young_applications" ON public.young_applications
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- 2) journey-videos storage: restrict writes to admins
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'journey-videos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
CREATE POLICY "Admin Update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'journey-videos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'journey-videos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

-- 3) module-thumbnails storage: restrict writes to admins
DROP POLICY IF EXISTS "ModuleThumbnails_Admin_Insert" ON storage.objects;
CREATE POLICY "ModuleThumbnails_Admin_Insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'module-thumbnails' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

DROP POLICY IF EXISTS "ModuleThumbnails_Admin_Update" ON storage.objects;
CREATE POLICY "ModuleThumbnails_Admin_Update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'module-thumbnails' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

DROP POLICY IF EXISTS "ModuleThumbnails_Admin_Delete" ON storage.objects;
CREATE POLICY "ModuleThumbnails_Admin_Delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'module-thumbnails' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));