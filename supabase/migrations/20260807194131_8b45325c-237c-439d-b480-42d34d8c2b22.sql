-- Restore table grants (previously wiped by a blanket REVOKE)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Anonymous visitors: only tables with anon/public-facing policies
GRANT SELECT ON public.achievements TO anon;
GRANT SELECT ON public.units TO anon;
GRANT SELECT ON public.modules TO anon;
GRANT SELECT ON public.exercises TO anon;
GRANT INSERT ON public.leads TO anon;

-- Function execute: authenticated only (internal helpers stay hidden from anon)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_ops_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_ceo_or_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_department_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_team_roster() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_learner_insights() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ops_submission_open(date) TO anon, authenticated, service_role;