-- Adiciona FK de executor_id para young_people para permitir joins no Supabase
ALTER TABLE public.client_services
  ADD CONSTRAINT client_services_executor_id_fkey
  FOREIGN KEY (executor_id) REFERENCES public.young_people(id);
