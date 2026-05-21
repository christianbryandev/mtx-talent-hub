
DROP FUNCTION IF EXISTS public.mark_checklist_item(uuid, uuid);
DROP FUNCTION IF EXISTS public.submit_quiz_attempt(uuid, uuid, numeric);

ALTER TABLE public.journey_cards DROP CONSTRAINT IF EXISTS journey_cards_phase_id_fkey;
ALTER TABLE public.journey_cards
  ADD CONSTRAINT journey_cards_phase_id_fkey
  FOREIGN KEY (phase_id) REFERENCES public.journey_phase_catalog(id) ON DELETE CASCADE;

ALTER TABLE public.journey_checklist_items DROP CONSTRAINT IF EXISTS journey_checklist_items_card_id_fkey;
ALTER TABLE public.journey_checklist_items
  ADD CONSTRAINT journey_checklist_items_card_id_fkey
  FOREIGN KEY (card_id) REFERENCES public.journey_cards(id) ON DELETE CASCADE;

ALTER TABLE public.user_checklist_progress DROP CONSTRAINT IF EXISTS user_checklist_progress_item_fkey;
ALTER TABLE public.user_checklist_progress
  ADD CONSTRAINT user_checklist_progress_item_fkey
  FOREIGN KEY (checklist_item_id) REFERENCES public.journey_checklist_items(id) ON DELETE CASCADE;

ALTER TABLE public.user_card_progress DROP CONSTRAINT IF EXISTS user_card_progress_card_fkey;
ALTER TABLE public.user_card_progress
  ADD CONSTRAINT user_card_progress_card_fkey
  FOREIGN KEY (card_id) REFERENCES public.journey_cards(id) ON DELETE CASCADE;

ALTER TABLE public.quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_quiz_id_fkey;
ALTER TABLE public.quiz_questions
  ADD CONSTRAINT quiz_questions_quiz_id_fkey
  FOREIGN KEY (quiz_id) REFERENCES public.quiz_templates(id) ON DELETE CASCADE;

ALTER TABLE public.quiz_options DROP CONSTRAINT IF EXISTS quiz_options_question_id_fkey;
ALTER TABLE public.quiz_options
  ADD CONSTRAINT quiz_options_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES public.quiz_questions(id) ON DELETE CASCADE;

ALTER TABLE public.quiz_templates DROP CONSTRAINT IF EXISTS quiz_templates_phase_id_fkey;
ALTER TABLE public.quiz_templates
  ADD CONSTRAINT quiz_templates_phase_id_fkey
  FOREIGN KEY (phase_id) REFERENCES public.journey_phase_catalog(id) ON DELETE CASCADE;

COMMENT ON TABLE public.journey_phase_catalog IS
  'SSOT do módulo Jornada (catálogo global de fases). Cards/itens/quizzes referenciam esta tabela.';

COMMENT ON TABLE public.journey_phases IS
  'DEPRECATED: modelo legado de fases por jovem (Kanban admin). Não usar para novos fluxos. SSOT = journey_phase_catalog + user_phase_status.';
