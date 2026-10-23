GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_ops_access(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_ceo_or_admin(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_department_role(uuid) TO anon, authenticated, service_role;