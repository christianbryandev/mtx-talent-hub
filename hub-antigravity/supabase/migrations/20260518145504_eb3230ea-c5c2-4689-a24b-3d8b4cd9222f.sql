-- Meetings module
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('geral_jovens','mentoria','operacional','comercial','alinhamento_entrega')),
  date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  is_recurring boolean DEFAULT false,
  recurrence_rule text,
  responsible_id uuid,
  agenda text,
  objectives text,
  decisions text,
  next_steps text,
  observations text,
  status text NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada','realizada','cancelada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  young_id uuid,
  profile_id uuid,
  present boolean,
  justification text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.meeting_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  task_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.meeting_agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  duration_minutes integer,
  responsible_id uuid,
  completed boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetings_date ON public.meetings(date);
CREATE INDEX idx_meeting_participants_meeting ON public.meeting_participants(meeting_id);
CREATE INDEX idx_meeting_participants_profile ON public.meeting_participants(profile_id);
CREATE INDEX idx_meeting_participants_young ON public.meeting_participants(young_id);
CREATE INDEX idx_meeting_agenda_meeting ON public.meeting_agenda_items(meeting_id);
CREATE INDEX idx_meeting_tasks_meeting ON public.meeting_tasks(meeting_id);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;

-- meetings policies
CREATE POLICY "Admins manage meetings" ON public.meetings FOR ALL
  USING (has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Comercial manage commercial meetings" ON public.meetings FOR ALL
  USING (has_role(auth.uid(),'comercial'::app_role) AND type IN ('comercial','operacional'))
  WITH CHECK (has_role(auth.uid(),'comercial'::app_role) AND type IN ('comercial','operacional'));

CREATE POLICY "Participants view their meetings" ON public.meetings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meeting_participants mp
      WHERE mp.meeting_id = meetings.id
      AND (
        mp.profile_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.young_people yp WHERE yp.id = mp.young_id AND yp.profile_id = auth.uid())
      )
    )
  );

-- meeting_participants policies
CREATE POLICY "Admins manage participants" ON public.meeting_participants FOR ALL
  USING (has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Comercial manage participants" ON public.meeting_participants FOR ALL
  USING (has_role(auth.uid(),'comercial'::app_role))
  WITH CHECK (has_role(auth.uid(),'comercial'::app_role));

CREATE POLICY "Self view participants" ON public.meeting_participants FOR SELECT
  USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.young_people yp WHERE yp.id = meeting_participants.young_id AND yp.profile_id = auth.uid())
  );

CREATE POLICY "Self update own presence" ON public.meeting_participants FOR UPDATE
  USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.young_people yp WHERE yp.id = meeting_participants.young_id AND yp.profile_id = auth.uid())
  );

-- meeting_tasks policies
CREATE POLICY "Admins manage meeting_tasks" ON public.meeting_tasks FOR ALL
  USING (has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Comercial manage meeting_tasks" ON public.meeting_tasks FOR ALL
  USING (has_role(auth.uid(),'comercial'::app_role))
  WITH CHECK (has_role(auth.uid(),'comercial'::app_role));

CREATE POLICY "Authenticated view meeting_tasks" ON public.meeting_tasks FOR SELECT TO authenticated
  USING (true);

-- meeting_agenda_items policies
CREATE POLICY "Admins manage agenda" ON public.meeting_agenda_items FOR ALL
  USING (has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'super_admin'::app_role) OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Comercial manage agenda" ON public.meeting_agenda_items FOR ALL
  USING (has_role(auth.uid(),'comercial'::app_role))
  WITH CHECK (has_role(auth.uid(),'comercial'::app_role));

CREATE POLICY "Participants view agenda" ON public.meeting_agenda_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meeting_participants mp
      WHERE mp.meeting_id = meeting_agenda_items.meeting_id
      AND (mp.profile_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.young_people yp WHERE yp.id = mp.young_id AND yp.profile_id = auth.uid()))
    )
  );

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
