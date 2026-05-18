
-- ============ young_people ============
CREATE TABLE public.young_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  photo_url text,
  birth_date date,
  age integer,
  cpf text,
  rg text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  state text,
  zip_code text,
  mother_name text,
  father_name text,
  legal_guardian text,
  guardian_contact text,
  education_level text,
  school text,
  current_situation text,
  family_income text,
  people_at_home integer,
  social_context text,
  testimony text,
  dreams text,
  skills text,
  interest_area text,
  vocation_area text,
  status text NOT NULL DEFAULT 'inscrito' CHECK (status IN ('inscrito','em_analise','aprovado','em_formacao','em_pratica','ativo','pausado','desligado','concluido')),
  trail_phase text CHECK (trail_phase IN ('fase_1','fase_2','fase_3','fase_4','fase_5')),
  entry_date date,
  mentor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  availability text,
  has_laptop boolean DEFAULT false,
  has_phone boolean DEFAULT false,
  has_internet boolean DEFAULT false,
  has_professional_chip boolean DEFAULT false,
  has_cnpj boolean DEFAULT false,
  cnpj_type text,
  cnpj_opening_date date,
  pix_key text,
  bank_name text,
  bank_agency text,
  bank_account text,
  first_client_attended boolean DEFAULT false,
  first_client_date date,
  total_income_generated numeric(10,2) DEFAULT 0,
  observations text,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_young_people_status ON public.young_people(status);
CREATE INDEX idx_young_people_phase ON public.young_people(trail_phase);
CREATE INDEX idx_young_people_mentor ON public.young_people(mentor_id);
CREATE INDEX idx_young_people_profile ON public.young_people(profile_id);

ALTER TABLE public.young_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all young_people"
  ON public.young_people FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Colaboradores view own young record"
  ON public.young_people FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Colaboradores update own young record"
  ON public.young_people FOR UPDATE
  USING (auth.uid() = profile_id);

-- Trigger: idade + updated_at
CREATE OR REPLACE FUNCTION public.young_people_before_save()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.birth_date IS NOT NULL THEN
    NEW.age := DATE_PART('year', AGE(NEW.birth_date))::int;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_young_people_before_save
  BEFORE INSERT OR UPDATE ON public.young_people
  FOR EACH ROW EXECUTE FUNCTION public.young_people_before_save();

-- ============ young_applications ============
CREATE TABLE public.young_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  age integer,
  birth_date date,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  state text,
  education_level text,
  currently_studying boolean,
  currently_working boolean,
  family_income text,
  personal_story text,
  dreams text,
  why_mtx text,
  perceived_skills text,
  has_laptop boolean,
  has_phone boolean,
  has_internet boolean,
  interest_area text,
  how_found_mtx text,
  data_authorization boolean DEFAULT false,
  guardian_authorization boolean,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_analise','aprovado','reprovado')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_young_applications_status ON public.young_applications(status);
CREATE INDEX idx_young_applications_created ON public.young_applications(created_at DESC);

ALTER TABLE public.young_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit application"
  ON public.young_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins manage applications"
  ON public.young_applications FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- ============ young_evolution ============
CREATE TABLE public.young_evolution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  young_id uuid NOT NULL REFERENCES public.young_people(id) ON DELETE CASCADE,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('status_change','phase_change','note','achievement')),
  previous_value text,
  new_value text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_young_evolution_young ON public.young_evolution(young_id, created_at DESC);

ALTER TABLE public.young_evolution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage evolution"
  ON public.young_evolution FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Colaboradores view own evolution"
  ON public.young_evolution FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.young_people yp
    WHERE yp.id = young_evolution.young_id AND yp.profile_id = auth.uid()
  ));

-- ============ young_attendance ============
CREATE TABLE public.young_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  young_id uuid NOT NULL REFERENCES public.young_people(id) ON DELETE CASCADE,
  meeting_id uuid,
  present boolean DEFAULT false,
  justification text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_young_attendance_young ON public.young_attendance(young_id);
CREATE INDEX idx_young_attendance_meeting ON public.young_attendance(meeting_id);

ALTER TABLE public.young_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage attendance"
  ON public.young_attendance FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Colaboradores view own attendance"
  ON public.young_attendance FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.young_people yp
    WHERE yp.id = young_attendance.young_id AND yp.profile_id = auth.uid()
  ));
