DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'opportunities'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunities;
    END IF;
END $$;
