-- Allow internal users (super_admin, admin, comercial, jovem_aprendiz) to view all user roles.
-- This is necessary so that non-admin roles (like Jovem Aprendiz) can list other users by role
-- in RelationalSelects components (such as selecting a "Responsável comercial").

DROP POLICY IF EXISTS "Internal users can view all roles" ON public.user_roles;

CREATE POLICY "Internal users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'comercial') OR
  public.has_role(auth.uid(), 'jovem_aprendiz')
);
