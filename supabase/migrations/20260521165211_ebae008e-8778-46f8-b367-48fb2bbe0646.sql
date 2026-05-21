
CREATE OR REPLACE VIEW public.vw_journey_ranking
WITH (security_invoker = on) AS
WITH totals AS (
  SELECT
    p.id            AS user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(SUM(xe.xp_amount), 0)::int AS total_xp
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'colaborador'
  LEFT JOIN public.xp_events xe ON xe.user_id = p.id
  GROUP BY p.id, p.full_name, p.avatar_url
)
SELECT
  user_id,
  full_name,
  -- compatibilidade com o pedido (first_name = primeiro nome)
  split_part(COALESCE(full_name, ''), ' ', 1) AS first_name,
  avatar_url,
  total_xp,
  DENSE_RANK() OVER (ORDER BY total_xp DESC) AS rank_position
FROM totals;

GRANT SELECT ON public.vw_journey_ranking TO authenticated;
REVOKE ALL ON public.vw_journey_ranking FROM anon;
