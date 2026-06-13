
-- Add tracking column for progress timestamps
ALTER TABLE public.young_people
  ADD COLUMN IF NOT EXISTS last_progress_at timestamptz NOT NULL DEFAULT now();

-- Quiz attempts table
CREATE TABLE IF NOT EXISTS public.young_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  young_id uuid NOT NULL,
  phase text NOT NULL,
  score numeric NOT NULL,
  passed boolean NOT NULL DEFAULT false,
  attempt_number int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.young_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qa_admin_all" ON public.young_quiz_attempts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "qa_self_view" ON public.young_quiz_attempts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.young_people yp WHERE yp.id = young_id AND yp.profile_id = auth.uid()));

CREATE POLICY "qa_self_insert" ON public.young_quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.young_people yp WHERE yp.id = young_id AND yp.profile_id = auth.uid()));

-- Phase review checklist progress (post-failure review)
CREATE TABLE IF NOT EXISTS public.phase_review_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  young_id uuid NOT NULL,
  phase text NOT NULL,
  attempt_id uuid REFERENCES public.young_quiz_attempts(id) ON DELETE CASCADE,
  item text NOT NULL,
  reviewed boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phase_review_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prp_admin_all" ON public.phase_review_progress FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "prp_self_all" ON public.phase_review_progress FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.young_people yp WHERE yp.id = young_id AND yp.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.young_people yp WHERE yp.id = young_id AND yp.profile_id = auth.uid()));
