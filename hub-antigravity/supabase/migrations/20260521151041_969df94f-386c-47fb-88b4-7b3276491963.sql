
REVOKE EXECUTE ON FUNCTION public.get_journey_kpis() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_journey_phase_distribution() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_journey_conversion() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_journey_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_journey_phase_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_journey_conversion() TO authenticated;
