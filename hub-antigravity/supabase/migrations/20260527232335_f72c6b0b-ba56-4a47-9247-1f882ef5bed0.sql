-- Rename enum value
ALTER TYPE public.app_role RENAME VALUE 'colaborador' TO 'jovem_aprendiz';

-- Update functions
CREATE OR REPLACE FUNCTION public.admin_get_journey_monitor()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_max_order int;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT MAX(order_index) INTO v_max_order FROM public.journey_phase_catalog;

  WITH base_users AS (
    SELECT DISTINCT p.id AS user_id, p.full_name, p.email
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'jovem_aprendiz'
  ),
  totals AS (
    SELECT bu.user_id,
      (SELECT COALESCE(SUM(xp_amount),0) FROM public.xp_events WHERE user_id = bu.user_id)::int AS total_xp,
      (SELECT COUNT(*) FROM public.journey_checklist_items WHERE required = true)::int AS total_items,
      (SELECT COUNT(*) FROM public.user_checklist_progress ucp
         JOIN public.journey_checklist_items ci ON ci.id = ucp.checklist_item_id
        WHERE ucp.user_id = bu.user_id AND ci.required = true)::int AS done_items,
      (SELECT MAX(completed_at) FROM public.user_checklist_progress WHERE user_id = bu.user_id) AS last_item_at
    FROM base_users bu
  ),
  quiz_stats AS (
    SELECT bu.user_id,
      (SELECT COUNT(*) FROM public.journey_quiz_attempts WHERE user_id = bu.user_id)::int AS total_attempts,
      (SELECT COUNT(DISTINCT phase_id) FROM public.journey_quiz_attempts WHERE user_id = bu.user_id)::int AS quizzes_taken,
      (SELECT COUNT(*) FROM public.journey_quiz_attempts WHERE user_id = bu.user_id AND passed = true)::int AS quizzes_passed,
      (SELECT score FROM public.journey_quiz_attempts WHERE user_id = bu.user_id ORDER BY created_at DESC LIMIT 1) AS last_score,
      (SELECT MAX(score) FROM public.journey_quiz_attempts WHERE user_id = bu.user_id) AS best_score,
      (SELECT MAX(created_at) FROM public.journey_quiz_attempts WHERE user_id = bu.user_id) AS last_attempt_at,
      (SELECT passed FROM public.journey_quiz_attempts WHERE user_id = bu.user_id ORDER BY created_at DESC LIMIT 1) AS last_attempt_passed
    FROM base_users bu
  ),
  current_phase AS (
    SELECT bu.user_id,
      (SELECT ph.title FROM public.user_phase_status ups
        JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
        WHERE ups.user_id = bu.user_id AND ups.status = 'em_andamento'
        ORDER BY ph.order_index ASC LIMIT 1) AS in_progress_title,
      (SELECT ph.title FROM public.user_phase_status ups
        JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
        WHERE ups.user_id = bu.user_id AND ups.status = 'concluido'
        ORDER BY ph.order_index DESC LIMIT 1) AS last_done_title,
      (SELECT COUNT(*) FROM public.user_phase_status ups
        JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
        WHERE ups.user_id = bu.user_id AND ph.order_index = v_max_order AND ups.status = 'concluido') AS journey_done_count,
      (SELECT MIN(unlocked_at) FROM public.user_phase_status WHERE user_id = bu.user_id) AS started_at,
      (SELECT MAX(unlocked_at) FROM public.user_phase_status WHERE user_id = bu.user_id AND status = 'em_andamento') AS in_progress_since
    FROM base_users bu
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', bu.user_id,
    'name', COALESCE(NULLIF(bu.full_name,''), bu.email, 'Sem nome'),
    'email', COALESCE(bu.email, ''),
    'total_xp', t.total_xp,
    'current_phase', COALESCE(cp.in_progress_title, cp.last_done_title, 'Não iniciada'),
    'progress_percentage', CASE WHEN t.total_items > 0
                                THEN ROUND((t.done_items::numeric / t.total_items::numeric) * 100)::int
                                ELSE 0 END,
    'quizzes_taken', q.quizzes_taken,
    'quizzes_passed', q.quizzes_passed,
    'total_attempts', q.total_attempts,
    'last_score', q.last_score,
    'best_score', q.best_score,
    'last_attempt_passed', q.last_attempt_passed,
    'last_activity', GREATEST(
      COALESCE(t.last_item_at, 'epoch'::timestamptz),
      COALESCE(q.last_attempt_at, 'epoch'::timestamptz),
      COALESCE(cp.in_progress_since, 'epoch'::timestamptz)
    ),
    'started_at', cp.started_at,
    'status', CASE
                WHEN cp.journey_done_count > 0 THEN 'Concluído'
                WHEN cp.started_at IS NULL THEN 'Não iniciada'
                WHEN q.last_attempt_passed IS FALSE THEN 'Reprovado'
                WHEN cp.in_progress_since IS NOT NULL
                     AND cp.in_progress_since < now() - INTERVAL '14 days'
                     AND t.done_items = 0 THEN 'Travado'
                ELSE 'Em andamento'
              END
  ) ORDER BY t.total_xp DESC), '[]'::jsonb)
  INTO v_result
  FROM base_users bu
  JOIN totals t ON t.user_id = bu.user_id
  JOIN quiz_stats q ON q.user_id = bu.user_id
  JOIN current_phase cp ON cp.user_id = bu.user_id;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_journey_tracking()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_max_order int;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT MAX(order_index) INTO v_max_order FROM public.journey_phase_catalog;

  WITH base_users AS (
    SELECT DISTINCT p.id AS user_id, p.full_name, p.email
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'jovem_aprendiz'
  ),
  totals AS (
    SELECT bu.user_id,
      (SELECT COALESCE(SUM(xp_amount),0) FROM public.xp_events
        WHERE user_id = bu.user_id)::int AS total_xp,
      (SELECT COUNT(*) FROM public.journey_checklist_items WHERE required = true)::int AS total_items,
      (SELECT COUNT(*) FROM public.user_checklist_progress ucp
         JOIN public.journey_checklist_items ci ON ci.id = ucp.checklist_item_id
        WHERE ucp.user_id = bu.user_id AND ci.required = true)::int AS done_items
    FROM base_users bu
  ),
  current_phase AS (
    SELECT bu.user_id,
      (
        SELECT ph.title FROM public.user_phase_status ups
        JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
        WHERE ups.user_id = bu.user_id AND ups.status = 'em_andamento'
        ORDER BY ph.order_index ASC LIMIT 1
      ) AS in_progress_title,
      (
        SELECT ph.title FROM public.user_phase_status ups
        JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
        WHERE ups.user_id = bu.user_id AND ups.status = 'concluido'
        ORDER BY ph.order_index DESC LIMIT 1
      ) AS last_done_title,
      (
        SELECT COUNT(*) FROM public.user_phase_status ups
        JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
        WHERE ups.user_id = bu.user_id AND ph.order_index = v_max_order AND ups.status = 'concluido'
      ) AS journey_done_count,
      (
        SELECT MAX(ups.unlocked_at) FROM public.user_phase_status ups
        WHERE ups.user_id = bu.user_id AND ups.status = 'em_andamento'
      ) AS in_progress_since,
      (
        SELECT passed FROM public.journey_quiz_attempts
        WHERE user_id = bu.user_id ORDER BY created_at DESC LIMIT 1
      ) AS last_attempt_passed
    FROM base_users bu
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', bu.user_id,
    'name', COALESCE(NULLIF(bu.full_name,''), bu.email, 'Sem nome'),
    'email', COALESCE(bu.email, ''),
    'total_xp', t.total_xp,
    'current_phase', COALESCE(cp.in_progress_title, cp.last_done_title, 'Não iniciada'),
    'progress_percentage', CASE WHEN t.total_items > 0
                                THEN ROUND((t.done_items::numeric / t.total_items::numeric) * 100)::int
                                ELSE 0 END,
    'status', CASE
                WHEN cp.journey_done_count > 0 THEN 'Concluído'
                WHEN cp.last_attempt_passed IS FALSE THEN 'Travado'
                WHEN cp.in_progress_since IS NOT NULL
                     AND cp.in_progress_since < now() - INTERVAL '14 days'
                     AND t.done_items = 0 THEN 'Travado'
                ELSE 'Em dia'
              END
  ) ORDER BY t.total_xp DESC), '[]'::jsonb)
  INTO v_result
  FROM base_users bu
  JOIN totals t ON t.user_id = bu.user_id
  JOIN current_phase cp ON cp.user_id = bu.user_id;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_access_chat()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'comercial', 'jovem_aprendiz')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_journey_kpis()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_users int;
  v_active_users int;
  v_completed_users int;
  v_avg_xp numeric;
  v_max_order int;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT MAX(order_index) INTO v_max_order FROM public.journey_phase_catalog;

  SELECT COUNT(DISTINCT ur.user_id) INTO v_total_users
    FROM public.user_roles ur WHERE ur.role = 'jovem_aprendiz';

  SELECT COUNT(DISTINCT ups.user_id) INTO v_active_users
    FROM public.user_phase_status ups
    WHERE ups.status = 'em_andamento';

  SELECT COUNT(*) INTO v_completed_users
  FROM (
    SELECT ups.user_id
    FROM public.user_phase_status ups
    JOIN public.journey_phase_catalog ph ON ph.id = ups.phase_id
    WHERE ph.order_index = v_max_order AND ups.status = 'concluido'
  ) s;

  SELECT COALESCE(AVG(total_xp), 0) INTO v_avg_xp FROM (
    SELECT user_id, SUM(xp_amount)::numeric AS total_xp
    FROM public.xp_events GROUP BY user_id
  ) t;

  RETURN jsonb_build_object(
    'total_users', COALESCE(v_total_users, 0),
    'active_users', COALESCE(v_active_users, 0),
    'completed_users', COALESCE(v_completed_users, 0),
    'avg_xp', ROUND(COALESCE(v_avg_xp, 0), 1)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_journey_ranking()
 RETURNS TABLE(user_id uuid, full_name text, first_name text, avatar_url text, total_xp integer, progress_percentage integer, rank_position bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH total_phases AS (
    SELECT count(*)::integer AS n
    FROM journey_phase_catalog
  ), 
  totals AS (
    SELECT 
      p.id AS user_id,
      p.full_name,
      p.avatar_url,
      (COALESCE(sum(xe.xp_amount), 0))::integer AS total_xp,
      COALESCE((
        SELECT count(*)::integer
        FROM user_phase_status ups
        WHERE ups.user_id = p.id AND ups.status = 'concluido'
      ), 0) AS phases_done
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'jovem_aprendiz'
    LEFT JOIN xp_events xe ON xe.user_id = p.id
    WHERE NOT EXISTS (
      SELECT 1
      FROM user_roles ur2
      WHERE ur2.user_id = p.id 
      AND ur2.role IN ('admin', 'super_admin')
    )
    GROUP BY p.id, p.full_name, p.avatar_url
  )
  SELECT 
    t.user_id,
    t.full_name,
    split_part(COALESCE(t.full_name, ''), ' ', 1) AS first_name,
    t.avatar_url,
    t.total_xp,
    CASE
      WHEN (SELECT n FROM total_phases) > 0 THEN 
        (round((t.phases_done::numeric / (SELECT n FROM total_phases)::numeric) * 100))::integer
      ELSE 0
    END AS progress_percentage,
    dense_rank() OVER (ORDER BY t.total_xp DESC) AS rank_position
  FROM totals t
  ORDER BY rank_position ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_primary_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'comercial' THEN 3
    WHEN 'jovem_aprendiz' THEN 4
    WHEN 'cliente' THEN 5
  END
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'jovem_aprendiz');

  RETURN NEW;
END;
$function$;

-- Update View
CREATE OR REPLACE VIEW public.vw_journey_ranking AS
 WITH total_phases AS (
         SELECT count(*)::integer AS n
           FROM journey_phase_catalog
        ), totals AS (
         SELECT p.id AS user_id,
            p.full_name,
            p.avatar_url,
            COALESCE(sum(xe.xp_amount), 0::bigint)::integer AS total_xp,
            COALESCE(( SELECT count(*)::integer AS count
                   FROM user_phase_status ups
                  WHERE ups.user_id = p.id AND ups.status = 'concluido'::text), 0) AS phases_done
           FROM profiles p
             JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'jovem_aprendiz'::app_role
             LEFT JOIN xp_events xe ON xe.user_id = p.id
          WHERE NOT (EXISTS ( SELECT 1
                   FROM user_roles ur2
                  WHERE ur2.user_id = p.id AND (ur2.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]))))
          GROUP BY p.id, p.full_name, p.avatar_url
        )
 SELECT user_id,
    full_name,
    split_part(COALESCE(full_name, ''::text), ' '::text, 1) AS first_name,
    avatar_url,
    total_xp,
        CASE
            WHEN (( SELECT total_phases.n
               FROM total_phases)) > 0 THEN round(phases_done::numeric / (( SELECT total_phases.n
               FROM total_phases))::numeric * 100::numeric)::integer
            ELSE 0
        END AS progress_percentage,
    dense_rank() OVER (ORDER BY total_xp DESC) AS rank_position
   FROM totals t;

-- Update Policies
DROP POLICY IF EXISTS "Allowed roles can view messages" ON public.chat_mensagens;
CREATE POLICY "Allowed roles can view messages" ON public.chat_mensagens
FOR SELECT USING (
  (EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['super_admin'::app_role, 'admin'::app_role]))))) 
  OR 
  ((EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['comercial'::app_role, 'jovem_aprendiz'::app_role]))))) AND (criado_em >= ( SELECT profiles.created_at FROM profiles WHERE (profiles.id = auth.uid()))))
);
