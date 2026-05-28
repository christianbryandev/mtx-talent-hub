-- Alterar a restrição da tabela young_people para cascatear a exclusão do perfil
ALTER TABLE public.young_people 
DROP CONSTRAINT IF EXISTS young_people_profile_id_fkey,
ADD CONSTRAINT young_people_profile_id_fkey 
  FOREIGN KEY (profile_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- Garantir que outras tabelas vinculadas ao jovem também tenham cascata (se ainda não tiverem)
ALTER TABLE public.young_evolution 
DROP CONSTRAINT IF EXISTS young_evolution_young_id_fkey,
ADD CONSTRAINT young_evolution_young_id_fkey 
  FOREIGN KEY (young_id) 
  REFERENCES public.young_people(id) 
  ON DELETE CASCADE;

ALTER TABLE public.young_attendance 
DROP CONSTRAINT IF EXISTS young_attendance_young_id_fkey,
ADD CONSTRAINT young_attendance_young_id_fkey 
  FOREIGN KEY (young_id) 
  REFERENCES public.young_people(id) 
  ON DELETE CASCADE;

ALTER TABLE public.service_young_people 
DROP CONSTRAINT IF EXISTS service_young_people_young_id_fkey,
ADD CONSTRAINT service_young_people_young_id_fkey 
  FOREIGN KEY (young_id) 
  REFERENCES public.young_people(id) 
  ON DELETE CASCADE;

ALTER TABLE public.journey_phases 
DROP CONSTRAINT IF EXISTS journey_phases_young_id_fkey,
ADD CONSTRAINT journey_phases_young_id_fkey 
  FOREIGN KEY (young_id) 
  REFERENCES public.young_people(id) 
  ON DELETE CASCADE;
