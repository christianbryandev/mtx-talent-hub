
-- 1) Consolidar funnel_stage para 6 etapas
UPDATE public.opportunities SET funnel_stage = 'prospeccao' WHERE funnel_stage IN ('icp_definido','segmentacao');
UPDATE public.opportunities SET funnel_stage = 'contato' WHERE funnel_stage IN ('contato_realizado','follow_up');
UPDATE public.opportunities SET funnel_stage = 'proposta' WHERE funnel_stage IN ('proposta_enviada','negociacao');
UPDATE public.opportunities SET funnel_stage = 'fechamento' WHERE funnel_stage = 'onboarding';

-- 2) Novos campos
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS is_icp boolean,
  ADD COLUMN IF NOT EXISTS segment_validated boolean,
  ADD COLUMN IF NOT EXISTS temperature text CHECK (temperature IN ('frio','morno','quente')),
  ADD COLUMN IF NOT EXISTS has_demand boolean,
  ADD COLUMN IF NOT EXISTS has_budget boolean,
  ADD COLUMN IF NOT EXISTS has_urgency boolean,
  ADD COLUMN IF NOT EXISTS qualification_score integer CHECK (qualification_score BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS problem_identified text,
  ADD COLUMN IF NOT EXISTS improvement_needed text,
  ADD COLUMN IF NOT EXISTS solution_opportunity text,
  ADD COLUMN IF NOT EXISTS proposal_value numeric,
  ADD COLUMN IF NOT EXISTS proposal_sent_date date,
  ADD COLUMN IF NOT EXISTS proposal_status text CHECK (proposal_status IN ('nao_enviada','enviada','em_analise','em_negociacao'));
