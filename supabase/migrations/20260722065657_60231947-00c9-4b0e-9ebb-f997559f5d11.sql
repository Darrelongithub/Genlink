
-- 1. Rename pillar ids on existing units, preserving UUIDs and progress
UPDATE public.units SET pillar_id = 'personal-mastery'  WHERE pillar_id = 'leadership-development';
UPDATE public.units SET pillar_id = 'digital-literacy'  WHERE pillar_id = 'digital-skills';
UPDATE public.units SET pillar_id = 'cybersecurity'     WHERE pillar_id = 'communication-networking';

-- 2. Re-parent Entrepreneurship units into Financial Intelligence as specialized bonus content.
--    Preserve their session_blocks + progress; make them "specialized" so the 7-unit core path
--    for Financial stays clean.
UPDATE public.units
   SET pillar_id   = 'financial-intelligence',
       track_type  = 'specialized'::track_type,
       order_index = order_index + 100  -- avoid unique-index clashes; sorts after core 1..7
 WHERE pillar_id = 'entrepreneurship-innovation';

-- 3. Programming & Intelligent Systems shell — 7 empty units, all locked
INSERT INTO public.units (pillar_id, title, description, order_index, session_count, total_xp, estimated_minutes, track_type, theme, is_locked_by_default)
SELECT 'programming-systems',
       'Unit ' || i || ': Programming & Intelligent Systems — Module ' || i,
       'Placeholder — content coming soon.',
       i, 5, 750, 240, 'learning_path'::track_type, 'digital'::pillar_theme, true
FROM generate_series(1, 7) AS s(i)
WHERE NOT EXISTS (SELECT 1 FROM public.units WHERE pillar_id = 'programming-systems');

-- 4. Migrate any lingering assessment_results pillar recommendations to new ids
UPDATE public.assessment_results SET primary_pillar_recommended   = 'personal-mastery'  WHERE primary_pillar_recommended   = 'leadership-development';
UPDATE public.assessment_results SET secondary_pillar_recommended = 'personal-mastery'  WHERE secondary_pillar_recommended = 'leadership-development';
UPDATE public.assessment_results SET primary_pillar_recommended   = 'digital-literacy'  WHERE primary_pillar_recommended   = 'digital-skills';
UPDATE public.assessment_results SET secondary_pillar_recommended = 'digital-literacy'  WHERE secondary_pillar_recommended = 'digital-skills';
UPDATE public.assessment_results SET primary_pillar_recommended   = 'cybersecurity'     WHERE primary_pillar_recommended   = 'communication-networking';
UPDATE public.assessment_results SET secondary_pillar_recommended = 'cybersecurity'     WHERE secondary_pillar_recommended = 'communication-networking';
UPDATE public.assessment_results SET primary_pillar_recommended   = 'financial-intelligence' WHERE primary_pillar_recommended   = 'entrepreneurship-innovation';
UPDATE public.assessment_results SET secondary_pillar_recommended = 'financial-intelligence' WHERE secondary_pillar_recommended = 'entrepreneurship-innovation';

-- 5. Migrate enrollments course_id references
UPDATE public.enrollments SET course_id = 'personal-mastery'       WHERE course_id = 'leadership-development';
UPDATE public.enrollments SET course_id = 'digital-literacy'       WHERE course_id = 'digital-skills';
UPDATE public.enrollments SET course_id = 'cybersecurity'          WHERE course_id = 'communication-networking';
UPDATE public.enrollments SET course_id = 'financial-intelligence' WHERE course_id = 'entrepreneurship-innovation';

-- 6. pillar_calibrations table for the optional 3-question calibration card (Fix 5)
CREATE TABLE IF NOT EXISTS public.pillar_calibrations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pillar_id           text NOT NULL,
  answers             jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  dismissed_at        timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pillar_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pillar_calibrations TO authenticated;
GRANT ALL ON public.pillar_calibrations TO service_role;

ALTER TABLE public.pillar_calibrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own calibrations"
  ON public.pillar_calibrations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff read all calibrations"
  ON public.pillar_calibrations
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND department_role IN ('ceo'::department_role, 'ops_manager'::department_role, 'curriculum'::department_role)
    )
  );

CREATE TRIGGER pillar_calibrations_updated_at
  BEFORE UPDATE ON public.pillar_calibrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
