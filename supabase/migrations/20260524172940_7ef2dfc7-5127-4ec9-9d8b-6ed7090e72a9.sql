-- Add columns to notifications table if they don't exist
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Ensure we have a bucket for notifications attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('notificacoes-anexos', 'notificacoes-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for notificacoes-anexos
CREATE POLICY "Public Access for notifications attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'notificacoes-anexos');

CREATE POLICY "Admins can upload notification attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'notificacoes-anexos' AND (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  )
);

CREATE POLICY "Admins can delete notification attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'notificacoes-anexos' AND (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  )
);
