-- Create the bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('journey-videos', 'journey-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public read access
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'journey-videos');

-- Policies for admin upload
CREATE POLICY "Admin Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'journey-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Admin Update" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'journey-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Admin Delete" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'journey-videos' AND auth.role() = 'authenticated');