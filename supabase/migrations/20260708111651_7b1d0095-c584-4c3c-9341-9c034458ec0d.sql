
CREATE OR REPLACE FUNCTION public.has_ops_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'moderator'::app_role)
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND department_role IN ('ceo'::department_role, 'ops_manager'::department_role)
  );
$$;

DROP POLICY IF EXISTS "Sessions are publicly readable" ON public.unit_sessions;

CREATE POLICY "Enrolled users can read unit sessions"
ON public.unit_sessions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.enrollments e ON e.course_id = u.pillar_id
    WHERE u.id = unit_sessions.unit_id
      AND e.user_id = auth.uid()
  )
);
