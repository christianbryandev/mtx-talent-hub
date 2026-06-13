CREATE OR REPLACE FUNCTION public.get_journey_ranking()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  first_name TEXT,
  avatar_url TEXT,
  total_xp INTEGER,
  progress_percentage INTEGER,
  rank_position BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'colaborador'
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
$$;

-- Grant access to authenticated users
REVOKE ALL ON FUNCTION public.get_journey_ranking() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_journey_ranking() TO authenticated;
