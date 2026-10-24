REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_ops_access(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_ceo_or_admin(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_department_role(uuid) FROM anon, authenticated;