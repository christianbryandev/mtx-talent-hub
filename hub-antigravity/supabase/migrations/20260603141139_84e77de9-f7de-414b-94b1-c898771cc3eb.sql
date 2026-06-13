ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

REVOKE ALL ON FUNCTION public.can_access_chat() FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT EXECUTE ON FUNCTION public.can_access_chat() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_catalog_phases() FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT EXECUTE ON FUNCTION public.get_catalog_phases() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_journey_ranking() FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT EXECUTE ON FUNCTION public.get_journey_ranking() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_invite_by_token(text) FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_invite_by_token_public(uuid) FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token_public(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.mark_invite_used(uuid) FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT EXECUTE ON FUNCTION public.mark_invite_used(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_member_chat_message() FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT EXECUTE ON FUNCTION public.handle_new_member_chat_message() TO service_role;

REVOKE ALL ON FUNCTION public.handle_achievement_chat_message() FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT EXECUTE ON FUNCTION public.handle_achievement_chat_message() TO service_role;

REVOKE ALL ON FUNCTION public.handle_phase_completion_chat_message() FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT EXECUTE ON FUNCTION public.handle_phase_completion_chat_message() TO service_role;

REVOKE ALL ON FUNCTION public.increment_module_indices(uuid, integer) FROM PUBLIC, anon, authenticated, service_role, sandbox_exec;
GRANT EXECUTE ON FUNCTION public.increment_module_indices(uuid, integer) TO service_role;