-- Make chat-assets bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-assets';

-- Drop overly-broad public read policy
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;

-- New SELECT policy: only authenticated users with chat access can read
CREATE POLICY "Chat participants can read chat assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-assets'
  AND public.can_access_chat()
);