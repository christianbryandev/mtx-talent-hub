-- Correção de dados existentes: Atualiza young_people onde full_name contém um email,
-- buscando o nome correto da tabela young_applications (vinculada pelo email).
-- Também corrige a tabela profiles onde full_name = email.

-- 1. Corrigir young_people.full_name onde valor contém "@" (é um email)
UPDATE public.young_people yp
SET full_name = ya.full_name
FROM public.young_applications ya
WHERE yp.full_name LIKE '%@%'
  AND ya.email = yp.email
  AND ya.full_name IS NOT NULL
  AND ya.full_name != ''
  AND ya.full_name NOT LIKE '%@%';

-- 2. Corrigir profiles.full_name onde valor = email
UPDATE public.profiles p
SET full_name = ya.full_name
FROM public.young_applications ya
WHERE (p.full_name = p.email OR p.full_name LIKE '%@%')
  AND ya.email = p.email
  AND ya.full_name IS NOT NULL
  AND ya.full_name != ''
  AND ya.full_name NOT LIKE '%@%';
