
-- 1) Prevent users from escalating their own department_role.
-- The guard function already exists; attach it as a trigger.
DROP TRIGGER IF EXISTS guard_profile_department_role_trg ON public.profiles;
CREATE TRIGGER guard_profile_department_role_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_department_role();

-- 2) Restrict quizzes visibility to users enrolled in the parent course.
DROP POLICY IF EXISTS "Anyone can view quizzes" ON public.quizzes;
CREATE POLICY "Enrolled users can view quizzes"
ON public.quizzes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = auth.uid()
      AND e.course_id = quizzes.course_id
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 3) Weekly reports: users can only update rows they submitted themselves.
DROP POLICY IF EXISTS "Users update own dept current report" ON public.weekly_reports;
CREATE POLICY "Users update own dept current report"
ON public.weekly_reports
FOR UPDATE
TO authenticated
USING (
  submitted_by = auth.uid()
  AND department = public.get_department_role(auth.uid())
  AND public.ops_submission_open(week_starting)
)
WITH CHECK (
  submitted_by = auth.uid()
  AND department = public.get_department_role(auth.uid())
  AND public.ops_submission_open(week_starting)
);
