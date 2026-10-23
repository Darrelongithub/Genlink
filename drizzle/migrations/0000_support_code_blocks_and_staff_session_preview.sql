ALTER TYPE public.session_block_type ADD VALUE IF NOT EXISTS 'code';

GRANT SELECT ON public.unit_sessions TO authenticated;
GRANT SELECT ON public.session_blocks TO authenticated;
GRANT UPDATE ON public.unit_sessions TO authenticated;
GRANT ALL ON public.unit_sessions TO service_role;
GRANT ALL ON public.session_blocks TO service_role;

DROP POLICY IF EXISTS "Enrolled users can read unit sessions" ON public.unit_sessions;
CREATE POLICY "Enrolled users and preview staff can read unit sessions"
ON public.unit_sessions
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.get_department_role(auth.uid()) IN ('ceo'::public.department_role, 'curriculum'::public.department_role)
  OR EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.enrollments e ON e.course_id = u.pillar_id
    WHERE u.id = unit_sessions.unit_id
      AND e.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Session blocks readable by admin or enrolled" ON public.session_blocks;
CREATE POLICY "Session blocks readable by enrolled users and preview staff"
ON public.session_blocks
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.get_department_role(auth.uid()) IN ('ceo'::public.department_role, 'curriculum'::public.department_role)
  OR EXISTS (
    SELECT 1
    FROM public.unit_sessions us
    JOIN public.units u ON u.id = us.unit_id
    JOIN public.enrollments e ON e.course_id = u.pillar_id AND e.user_id = auth.uid()
    WHERE us.id = session_blocks.session_id
  )
);

CREATE POLICY "Admins update imported session titles"
ON public.unit_sessions
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));