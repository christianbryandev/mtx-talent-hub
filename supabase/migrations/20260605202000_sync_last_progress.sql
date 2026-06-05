-- Atualiza a data de última atividade com base no último login real do usuário
-- Isso corrige os casos antigos onde o jovem acessava o sistema mas o last_progress_at não atualizava
UPDATE public.young_people yp
SET last_progress_at = COALESCE(u.last_sign_in_at, yp.last_progress_at)
FROM auth.users u
WHERE yp.profile_id = u.id 
  AND u.last_sign_in_at IS NOT NULL
  AND u.last_sign_in_at > yp.last_progress_at;
