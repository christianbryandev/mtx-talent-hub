-- Revoke EXECUTE from anon on functions that should not be public
REVOKE EXECUTE ON FUNCTION public.get_invite_by_token(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_invite_used(uuid) FROM anon;

-- Revoke EXECUTE from authenticated on internal/admin-only functions
REVOKE EXECUTE ON FUNCTION public.admin_get_journey_monitor() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_journey_tracking() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_quiz_options(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_journey_conversion() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_journey_kpis() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_journey_phase_distribution() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_system_event(uuid, text, text, text, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.record_system_event(uuid, text, text, uuid, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_journey_demo() FROM authenticated;