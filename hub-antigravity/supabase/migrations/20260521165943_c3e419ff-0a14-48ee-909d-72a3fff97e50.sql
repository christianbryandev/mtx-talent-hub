
DROP VIEW IF EXISTS public.vw_journey_ranking;

CREATE VIEW public.vw_journey_ranking
WITH (security_invoker = on) AS
WITH total_phases AS (
  SELECT COUNT(*)::int AS n FROM public.journey_phase_catalog
),
totals AS (
  SELECT
    p.id AS user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(SUM(xe.xp_amount), 0)::int AS total_xp,
    COALESCE((
      SELECT COUNT(*)::int
      FROM public.user_phase_status ups
      WHERE ups.user_id = p.id AND ups.status = 'concluido'
    ), 0) AS phases_done
  FROM public.profiles p
  JOIN public.user_roles ur
    ON ur.user_id = p.id AND ur.role = 'colaborador'::app_role
  LEFT JOIN public.xp_events xe ON xe.user_id = p.id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = p.id
      AND ur2.role IN ('admin'::app_role, 'super_admin'::app_role)
  )
  GROUP BY p.id, p.full_name, p.avatar_url
)
SELECT
  t.user_id,
  t.full_name,
  split_part(COALESCE(t.full_name, ''), ' ', 1) AS first_name,
  t.avatar_url,
  t.total_xp,
  CASE WHEN (SELECT n FROM total_phases) > 0
       THEN ROUND((t.phases_done::numeric / (SELECT n FROM total_phases)) * 100)::int
       ELSE 0
  END AS progress_percentage,
  DENSE_RANK() OVER (ORDER BY t.total_xp DESC) AS rank_position
FROM totals t;

GRANT SELECT ON public.vw_journey_ranking TO authenticated;
REVOKE ALL ON public.vw_journey_ranking FROM anon;
