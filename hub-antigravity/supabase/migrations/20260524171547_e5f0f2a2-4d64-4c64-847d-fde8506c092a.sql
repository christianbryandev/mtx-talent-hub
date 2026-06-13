-- Allow all authenticated users to view roles so the can_access_chat() function works for everyone
CREATE POLICY "All authenticated users can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert their own membership
CREATE POLICY "Users can join chat"
ON public.chat_membros
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = perfil_id);

-- Allow authenticated users to view memberships (needed for loading history)
CREATE POLICY "Users can view memberships"
ON public.chat_membros
FOR SELECT
TO authenticated
USING (true);
