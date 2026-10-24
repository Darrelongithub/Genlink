ALTER TABLE public.units
  ADD COLUMN status text NOT NULL DEFAULT 'live',
  ADD COLUMN counts_toward_completion boolean NOT NULL DEFAULT true;

ALTER TABLE public.units ADD CONSTRAINT units_status_check CHECK (status IN ('live','coming_soon','hidden'));

-- Backfills (part of this additive change):
-- Hide the seven Entrepreneurship & Innovation units under Financial Intelligence.
UPDATE public.units SET status = 'hidden'
WHERE pillar_id = 'financial-intelligence' AND track_type = 'specialized'
  AND title ILIKE '%Entrepreneurship & Innovation%';

-- Personal Mastery units 4, 5 and 7 are coming soon.
UPDATE public.units SET status = 'coming_soon'
WHERE pillar_id = 'personal-mastery' AND track_type = 'learning_path' AND order_index IN (4, 5, 7);

-- Bonus / deep-dive (specialized) units never count toward completion.
UPDATE public.units SET counts_toward_completion = false WHERE track_type = 'specialized';

-- Completion percentages count only live, completion-counting units.
CREATE OR REPLACE FUNCTION public.pillar_completion_pct(_user_id uuid, _pillar_id text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(floor(100.0 * SUM(LEAST(COALESCE(p.sessions_completed,0), u.session_count))
                        / NULLIF(SUM(u.session_count),0))::int, 0)
  FROM public.units u
  LEFT JOIN public.user_unit_progress p ON p.unit_id = u.id AND p.user_id = _user_id
  WHERE u.pillar_id = _pillar_id AND u.track_type = 'learning_path'
    AND u.status = 'live' AND u.counts_toward_completion;
$function$;

-- Preview unit must be a live unit.
CREATE OR REPLACE FUNCTION public.get_pillar_access()
 RETURNS TABLE(pillar_id text, name text, track text, order_index integer, state text, enrolled boolean, unlock_source text, progress_pct integer, requirements jsonb, preview_unit_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
       AND u.status = 'live'
       ORDER BY u.order_index LIMIT 1)
  FROM base b ORDER BY b.order_index;
$function$;

-- Admins can change unit status from the importer.
CREATE POLICY "Admins can update units"
ON public.units FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));