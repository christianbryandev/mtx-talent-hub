-- Remove as perguntas criadas acidentalmente pelo erro de permissão
DELETE FROM public.quiz_questions 
WHERE question = 'Nova pergunta';
