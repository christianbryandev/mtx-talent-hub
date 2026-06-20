-- Fix ranking: include 'comercial' role and fallback to young_people.photo_url for avatar

-- 1) Update the RPC function
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
      p.id AS uid,
      p.full_name AS uname,
      COALESCE(p.avatar_url, yp.photo_url) AS uavatar,
      (COALESCE(sum(xe.xp_amount), 0))::integer AS uxp,
      COALESCE((
        SELECT count(*)::integer
        FROM user_phase_status ups
        WHERE ups.user_id = p.id AND ups.status = 'concluido'
      ), 0) AS phases_done
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id AND ur.role IN ('jovem_aprendiz', 'comercial')
    LEFT JOIN young_people yp ON yp.profile_id = p.id
    LEFT JOIN xp_events xe ON xe.user_id = p.id
    WHERE NOT EXISTS (
      SELECT 1
      FROM user_roles ur2
      WHERE ur2.user_id = p.id 
      AND ur2.role IN ('admin', 'super_admin')
    )
    GROUP BY p.id, p.full_name, p.avatar_url, yp.photo_url
  )
  SELECT 
    t.uid AS user_id,
    t.uname AS full_name,
    split_part(COALESCE(t.uname, ''), ' ', 1) AS first_name,
    t.uavatar AS avatar_url,
    t.uxp AS total_xp,
    CASE
      WHEN (SELECT n FROM total_phases) > 0 THEN 
        (round((t.phases_done::numeric / (SELECT n FROM total_phases)::numeric) * 100))::integer
      ELSE 0
    END AS progress_percentage,
    dense_rank() OVER (ORDER BY t.uxp DESC) AS rank_position
  FROM totals t
  ORDER BY rank_position ASC;
END;
$function$;

-- 2) Update the view
CREATE OR REPLACE VIEW public.vw_journey_ranking AS
 WITH total_phases AS (
         SELECT count(*)::integer AS n
           FROM journey_phase_catalog
        ), totals AS (
         SELECT p.id AS user_id,
            p.full_name,
            COALESCE(p.avatar_url, yp.photo_url) AS avatar_url,
            COALESCE(sum(xe.xp_amount), 0::bigint)::integer AS total_xp,
            COALESCE(( SELECT count(*)::integer AS count
                   FROM user_phase_status ups
                  WHERE ups.user_id = p.id AND ups.status = 'concluido'::text), 0) AS phases_done
           FROM profiles p
             JOIN user_roles ur ON ur.user_id = p.id AND ur.role IN ('jovem_aprendiz'::app_role, 'comercial'::app_role)
             LEFT JOIN young_people yp ON yp.profile_id = p.id
             LEFT JOIN xp_events xe ON xe.user_id = p.id
          WHERE NOT (EXISTS ( SELECT 1
                   FROM user_roles ur2
                  WHERE ur2.user_id = p.id AND (ur2.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]))))
          GROUP BY p.id, p.full_name, p.avatar_url, yp.photo_url
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
