CREATE TABLE public.pillars (
  id text PRIMARY KEY,
  name text NOT NULL,
  order_index integer NOT NULL,
  track text NOT NULL CHECK (track IN ('foundation','specialisation')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pillars TO anon, authenticated;
GRANT ALL ON public.pillars TO service_role;
ALTER TABLE public.pillars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pillar catalogue is readable" ON public.pillars FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins and CEO manage pillars" ON public.pillars FOR ALL TO authenticated
  USING (public.is_ceo_or_admin(auth.uid())) WITH CHECK (public.is_ceo_or_admin(auth.uid()));
GRANT INSERT, UPDATE, DELETE ON public.pillars TO authenticated;

CREATE TABLE public.pillar_unlock_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id text NOT NULL REFERENCES public.pillars(id) ON DELETE CASCADE,
  requires_pillar_id text NOT NULL REFERENCES public.pillars(id) ON DELETE CASCADE,
  min_completion_pct integer NOT NULL CHECK (min_completion_pct BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pillar_id, requires_pillar_id)
);
GRANT SELECT ON public.pillar_unlock_rules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pillar_unlock_rules TO authenticated;
GRANT ALL ON public.pillar_unlock_rules TO service_role;
ALTER TABLE public.pillar_unlock_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Unlock rules are readable" ON public.pillar_unlock_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins and CEO manage unlock rules" ON public.pillar_unlock_rules FOR ALL TO authenticated
  USING (public.is_ceo_or_admin(auth.uid())) WITH CHECK (public.is_ceo_or_admin(auth.uid()));

ALTER TABLE public.enrollments ADD COLUMN unlock_source text NOT NULL DEFAULT 'progress'
  CHECK (unlock_source IN ('progress','cohort','staff_grant','grandfathered'));
UPDATE public.enrollments SET unlock_source = 'grandfathered' WHERE id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_pillar_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id
               AND department_role IN ('ceo','curriculum','ops_manager'));
$$;

CREATE OR REPLACE FUNCTION public.pillar_completion_pct(_user_id uuid, _pillar_id text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(floor(100.0 * SUM(LEAST(COALESCE(p.sessions_completed,0), u.session_count))
                        / NULLIF(SUM(u.session_count),0))::int, 0)
  FROM public.units u
  LEFT JOIN public.user_unit_progress p ON p.unit_id = u.id AND p.user_id = _user_id
  WHERE u.pillar_id = _pillar_id AND u.track_type = 'learning_path';
$$;

CREATE OR REPLACE FUNCTION public.can_access_pillar(_user_id uuid, _pillar_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.enrollments e WHERE e.user_id = _user_id AND e.course_id = _pillar_id
                 AND e.unlock_source IN ('staff_grant','cohort','grandfathered'))
    OR NOT EXISTS (SELECT 1 FROM public.pillar_unlock_rules r WHERE r.pillar_id = _pillar_id
                   AND public.pillar_completion_pct(_user_id, r.requires_pillar_id) < r.min_completion_pct);
$$;

REVOKE ALL ON FUNCTION public.is_pillar_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pillar_completion_pct(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_pillar(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pillar_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pillar_completion_pct(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_pillar(uuid, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can create their own enrollments" ON public.enrollments;
CREATE POLICY "Learners enrol only into unlocked pillars" ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND unlock_source = 'progress'
              AND (public.can_access_pillar(auth.uid(), course_id) OR public.is_pillar_staff(auth.uid())));

CREATE OR REPLACE FUNCTION public.guard_enrollment_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_pillar_staff(auth.uid())
     AND (NEW.unlock_source IS DISTINCT FROM OLD.unlock_source
          OR NEW.course_id IS DISTINCT FROM OLD.course_id
          OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'Only staff may change how an enrollment was unlocked';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_enrollment_changes_trg BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.guard_enrollment_changes();

-- Preview: Unit 1 Session 1 of each pillar is readable by anyone.
CREATE OR REPLACE FUNCTION public.is_preview_session(_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.unit_sessions s JOIN public.units u ON u.id = s.unit_id
    WHERE s.id = _session_id AND s.order_index = 0 AND u.track_type = 'learning_path'
      AND u.order_index = (SELECT MIN(u2.order_index) FROM public.units u2
                           WHERE u2.pillar_id = u.pillar_id AND u2.track_type = 'learning_path'));
$$;
GRANT EXECUTE ON FUNCTION public.is_preview_session(uuid) TO anon, authenticated, service_role;
GRANT SELECT ON public.unit_sessions TO anon;
GRANT SELECT ON public.session_blocks TO anon;
CREATE POLICY "Anyone can read the preview session" ON public.unit_sessions FOR SELECT TO anon, authenticated
  USING (public.is_preview_session(id));
CREATE POLICY "Anyone can read preview session blocks" ON public.session_blocks FOR SELECT TO anon, authenticated
  USING (public.is_preview_session(session_id));

CREATE OR REPLACE FUNCTION public.get_pillar_access()
RETURNS TABLE(pillar_id text, name text, track text, order_index integer, state text, enrolled boolean,
              unlock_source text, progress_pct integer, requirements jsonb, preview_unit_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  base AS (
    SELECT p.*, e.unlock_source AS src,
      (SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'pillar_id', r.requires_pillar_id, 'name', rp.name, 'order_index', rp.order_index,
          'required_pct', r.min_completion_pct,
          'current_pct', public.pillar_completion_pct((SELECT uid FROM me), r.requires_pillar_id),
          'met', public.pillar_completion_pct((SELECT uid FROM me), r.requires_pillar_id) >= r.min_completion_pct)
          ORDER BY rp.order_index), '[]'::jsonb)
       FROM public.pillar_unlock_rules r JOIN public.pillars rp ON rp.id = r.requires_pillar_id
       WHERE r.pillar_id = p.id) AS reqs
    FROM public.pillars p
    LEFT JOIN public.enrollments e ON e.course_id = p.id AND e.user_id = (SELECT uid FROM me)
  )
  SELECT b.id, b.name, b.track, b.order_index,
    CASE WHEN b.src IN ('staff_grant','cohort','grandfathered')
           OR ((SELECT uid FROM me) IS NOT NULL AND public.is_pillar_staff((SELECT uid FROM me)))
           OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(b.reqs) x WHERE NOT (x->>'met')::boolean)
         THEN 'open' ELSE 'locked' END,
    b.src IS NOT NULL, b.src,
    public.pillar_completion_pct((SELECT uid FROM me), b.id),
    (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM jsonb_array_elements(b.reqs) x WHERE NOT (x->>'met')::boolean),
    (SELECT u.id FROM public.units u WHERE u.pillar_id = b.id AND u.track_type = 'learning_path'
       ORDER BY u.order_index LIMIT 1)
  FROM base b ORDER BY b.order_index;
$$;
REVOKE ALL ON FUNCTION public.get_pillar_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pillar_access() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.grant_pillar_access(_user_id uuid, _pillar_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_pillar_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only admin, CEO, curriculum or operations staff may grant pillar access';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pillars WHERE id = _pillar_id) THEN
    RAISE EXCEPTION 'Unknown pillar %', _pillar_id;
  END IF;
  UPDATE public.enrollments SET unlock_source = 'staff_grant' WHERE user_id = _user_id AND course_id = _pillar_id;
  IF NOT FOUND THEN
    INSERT INTO public.enrollments (user_id, course_id, progress, completed, unlock_source)
    VALUES (_user_id, _pillar_id, 0, false, 'staff_grant');
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.grant_pillar_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_pillar_access(uuid, text) TO authenticated;