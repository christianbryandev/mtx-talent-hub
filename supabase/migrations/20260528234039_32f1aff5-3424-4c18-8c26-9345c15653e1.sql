-- Add thumbnail_url to journey_modules if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journey_modules' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE public.journey_modules ADD COLUMN thumbnail_url TEXT;
    END IF;
END $$;

-- Define the phase ID
DO $$
DECLARE
    v_phase_id UUID := '10f5c221-1687-4588-af47-a0fdcd76c04d';
BEGIN
    -- Remove the specific modules
    DELETE FROM public.journey_modules 
    WHERE id IN (
        '1f29cf5c-86ef-4ead-8dc3-08e7d99effe2', 
        '555884dd-833b-44c4-832c-410ea82d1bd0', 
        '39f126c0-8f70-4f3c-9405-7e210b8e06f1', 
        'c0b91a97-8ce5-4ce9-b57e-9c7c6e0f4a64'
    );

    -- Check if the video module already exists, if not insert it
    IF NOT EXISTS (SELECT 1 FROM public.journey_modules WHERE phase_id = v_phase_id AND content_type = 'video' AND title = 'Vídeo 01') THEN
        INSERT INTO public.journey_modules (
            id,
            phase_id,
            title,
            description,
            content_type,
            content_body,
            order_index,
            duration_minutes
        ) VALUES (
            gen_random_uuid(),
            v_phase_id,
            'Vídeo 01',
            'Descrição do vídeo',
            'video',
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            1,
            5
        );
    END IF;

    -- Update the quiz order index
    UPDATE public.journey_modules 
    SET order_index = 2 
    WHERE phase_id = v_phase_id AND (content_type = 'quiz' OR title = 'Novo Quiz');
END $$;

-- Create storage bucket for module thumbnails if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('module-thumbnails', 'module-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for module-thumbnails
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ModuleThumbnails_Public_Select') THEN
        CREATE POLICY "ModuleThumbnails_Public_Select" ON storage.objects FOR SELECT USING (bucket_id = 'module-thumbnails');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ModuleThumbnails_Admin_Insert') THEN
        CREATE POLICY "ModuleThumbnails_Admin_Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'module-thumbnails');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ModuleThumbnails_Admin_Update') THEN
        CREATE POLICY "ModuleThumbnails_Admin_Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'module-thumbnails');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ModuleThumbnails_Admin_Delete') THEN
        CREATE POLICY "ModuleThumbnails_Admin_Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'module-thumbnails');
    END IF;
END $$;