
ALTER FUNCTION public.ops_submission_open(date) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_ops_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_department_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profile_department_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ops_submission_open(date) FROM PUBLIC, anon;
