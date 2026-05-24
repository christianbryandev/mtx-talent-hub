-- Create the bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-assets', 'chat-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for public read access
CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat-assets');

-- Policy for super_admin to upload
CREATE POLICY "Super Admin Upload Access" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-assets' AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Policy for super_admin to update
CREATE POLICY "Super Admin Update Access" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'chat-assets' AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Policy for super_admin to delete
CREATE POLICY "Super Admin Delete Access" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'chat-assets' AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);