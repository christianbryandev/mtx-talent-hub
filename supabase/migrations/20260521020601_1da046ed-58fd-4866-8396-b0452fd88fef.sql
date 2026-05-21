-- RPC 1: update_phase_checklist
CREATE OR REPLACE FUNCTION public.update_phase_checklist(
  _phase_id uuid,
  _checklist jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _young_id uuid;
  _is_admin boolean;
  _is_owner boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized: not authenticated';
  END IF;

  SELECT young_id INTO _young_id
  FROM public.journey_phases
  WHERE id = _phase_id;

  IF _young_id IS NULL THEN
    RAISE EXCEPTION 'phase_not_found';
  END IF;

  _is_admin := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin');

  SELECT EXISTS (
    SELECT 1 FROM public.young_people yp
    WHERE yp.id = _young_id AND yp.profile_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.journey_phase_assignees jpa
    JOIN public.young_people yp ON yp.id = jpa.young_id
    WHERE jpa.phase_id = _phase_id AND yp.profile_id = auth.uid()
  ) INTO _is_owner;

  IF NOT (_is_admin OR _is_owner) THEN
    RAISE EXCEPTION 'unauthorized: user does not own this phase';
  END IF;

  IF jsonb_typeof(_checklist) <> 'array' THEN
    RAISE EXCEPTION 'invalid_checklist: must be a JSON array';
  END IF;

  UPDATE public.journey_phases
  SET checklist = _checklist,
      updated_at = now()
  WHERE id = _phase_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_phase_checklist(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_phase_checklist(uuid, jsonb) TO authenticated;

-- RPC 2: update_phase_fields (whitelist de campos)
CREATE OR REPLACE FUNCTION public.update_phase_fields(
  _phase_id uuid,
  _data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _young_id uuid;
  _is_admin boolean;
  _is_owner boolean;
  _new_young_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized: not authenticated';
  END IF;

  SELECT young_id INTO _young_id
  FROM public.journey_phases
  WHERE id = _phase_id;

  IF _young_id IS NULL THEN
    RAISE EXCEPTION 'phase_not_found';
  END IF;

  _is_admin := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin');

  SELECT EXISTS (
    SELECT 1 FROM public.young_people yp
    WHERE yp.id = _young_id AND yp.profile_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.journey_phase_assignees jpa
    JOIN public.young_people yp ON yp.id = jpa.young_id
    WHERE jpa.phase_id = _phase_id AND yp.profile_id = auth.uid()
  ) INTO _is_owner;

  IF NOT (_is_admin OR _is_owner) THEN
    RAISE EXCEPTION 'unauthorized: user does not own this phase';
  END IF;

  -- Reatribuição de dono: apenas admin
  IF _data ? 'young_id' THEN
    IF NOT _is_admin THEN
      RAISE EXCEPTION 'unauthorized: only admins can reassign young_id';
    END IF;
    _new_young_id := (_data->>'young_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.young_people WHERE id = _new_young_id) THEN
      RAISE EXCEPTION 'invalid young_id';
    END IF;
  END IF;

  UPDATE public.journey_phases
  SET
    title          = COALESCE(_data->>'title', title),
    description    = CASE WHEN _data ? 'description' THEN _data->>'description' ELSE description END,
    status         = COALESCE(_data->>'status', status),
    phase          = COALESCE(_data->>'phase', phase),
    position       = COALESCE((_data->>'position')::int, position),
    checklist      = COALESCE(_data->'checklist', checklist),
    training_links = COALESCE(_data->'training_links', training_links),
    young_id       = COALESCE(_new_young_id, young_id),
    updated_at     = now()
  WHERE id = _phase_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_phase_fields(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_phase_fields(uuid, jsonb) TO authenticated;