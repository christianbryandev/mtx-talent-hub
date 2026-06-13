-- Corrige os nomes na tabela young_people que ficaram salvos como e-mail (antes da correção do perfil)
-- Como criamos os Triggers de sincronização anteriormente, ao atualizar aqui, a tabela `profiles` e a autenticação do Supabase serão atualizadas automaticamente!
UPDATE public.young_people yp
SET full_name = app.full_name
FROM public.young_applications app
WHERE yp.email = app.email 
  AND yp.full_name LIKE '%@%';
