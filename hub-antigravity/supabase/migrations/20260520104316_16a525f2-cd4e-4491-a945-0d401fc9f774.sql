
-- Add created_by and is_personal to meetings for personal meeting support
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS is_personal boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON public.meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_is_personal ON public.meetings(is_personal);

-- Update RLS so colaboradores can manage their OWN personal meetings, and only see those + meetings they participate in
DROP POLICY IF EXISTS "Colaborador manage own personal meetings" ON public.meetings;
CREATE POLICY "Colaborador manage own personal meetings"
  ON public.meetings
  FOR ALL
  TO authenticated
  USING (is_personal = true AND created_by = auth.uid())
  WITH CHECK (is_personal = true AND created_by = auth.uid());

-- Hide personal meetings from admins/comercial listings UNLESS they own them
-- (admins still manage non-personal via existing "Admins manage meetings" policy;
--  we restrict their SELECT to exclude others' personal meetings)
DROP POLICY IF EXISTS "Admins view non-personal or own personal" ON public.meetings;
CREATE POLICY "Admins view non-personal or own personal"
  ON public.meetings
  FOR SELECT
  TO authenticated
  USING (
    (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND (is_personal = false OR created_by = auth.uid())
  );

-- Ensure personal meetings are NEVER seen by other users via participants policy:
-- Override "Participants view their meetings" to exclude personal meetings owned by others
DROP POLICY IF EXISTS "Participants view their meetings" ON public.meetings;
CREATE POLICY "Participants view their meetings"
  ON public.meetings
  FOR SELECT
  TO authenticated
  USING (
    (is_personal = false OR created_by = auth.uid())
    AND EXISTS (
      SELECT 1 FROM meeting_participants mp
      WHERE mp.meeting_id = meetings.id
        AND (
          mp.profile_id = auth.uid()
          OR EXISTS (SELECT 1 FROM young_people yp WHERE yp.id = mp.young_id AND yp.profile_id = auth.uid())
        )
    )
  );

-- Ensure profile updates touch updated_at so caches can react
-- (profiles already has trigger via update_updated_at_column; nothing to add)
