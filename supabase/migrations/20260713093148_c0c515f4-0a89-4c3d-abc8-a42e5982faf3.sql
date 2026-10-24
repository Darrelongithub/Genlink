DROP TRIGGER IF EXISTS guard_profile_department_role_trg ON public.profiles;
CREATE TRIGGER guard_profile_department_role_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_department_role();