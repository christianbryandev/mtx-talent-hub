-- Restore EXECUTE permissions to authenticated users for admin and KPI functions.
-- These functions perform role checks internally, so revoking them from 'authenticated'
-- completely broke them in the frontend via PostgREST.

GRANT EXECUTE ON FUNCTION public.admin_get_journey_monitor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_journey_tracking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_quiz_options(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_journey_conversion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_journey_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_journey_phase_distribution() TO authenticated;
