
-- 1) Remove a política de SELECT ampla do comercial sobre a tabela base
DROP POLICY IF EXISTS "Comercial view young_people" ON public.young_people;

-- 2) Cria a view segura (sem PII sensível)
--    Postgres views rodam com privilégios do owner (postgres) por padrão,
--    portanto contornam o RLS da tabela base. Adicionamos security_barrier
--    para evitar leaks via predicate pushdown e filtramos por role na própria view.
DROP VIEW IF EXISTS public.young_people_safe;
CREATE VIEW public.young_people_safe
WITH (security_barrier = true) AS
SELECT
  id,
  full_name,
  photo_url,
  age,
  phone,
  whatsapp,
  email,
  city,
  state,
  education_level,
  school,
  current_situation,
  dreams,
  skills,
  interest_area,
  vocation_area,
  status,
  trail_phase,
  entry_date,
  mentor_id,
  availability,
  has_laptop,
  has_phone,
  has_internet,
  has_professional_chip,
  has_cnpj,
  observations,
  profile_id,
  created_at,
  updated_at,
  last_progress_at
FROM public.young_people yp
WHERE
  -- admins/super_admin sempre veem; comercial vê tudo (sem PII); o próprio jovem vê o próprio registro
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'comercial'::public.app_role)
  OR yp.profile_id = auth.uid();

-- 3) Permissões na view (somente authenticated)
REVOKE ALL ON public.young_people_safe FROM PUBLIC;
REVOKE ALL ON public.young_people_safe FROM anon;
GRANT SELECT ON public.young_people_safe TO authenticated;
