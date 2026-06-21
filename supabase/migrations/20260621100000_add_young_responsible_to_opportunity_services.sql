-- Adiciona coluna para vincular jovem responsável a cada serviço da oportunidade
ALTER TABLE public.opportunity_services
  ADD COLUMN IF NOT EXISTS young_responsible_id uuid REFERENCES public.young_people(id);
