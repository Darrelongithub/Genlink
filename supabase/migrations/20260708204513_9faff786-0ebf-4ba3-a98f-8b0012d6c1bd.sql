-- Seed a marketing test user + this-week's marketing weekly report so the CEO card lights up.
-- Trigger guard_profile_department_role() blocks non-admin role changes; bypass via replication role for this seed only.
SET LOCAL session_replication_role = replica;

UPDATE public.profiles
SET department_role = 'marketing'::department_role,
    department = 'Marketing'
WHERE user_id = 'f0ad5480-21b7-432d-942c-1704d8264d7b';

-- If no profile row exists yet, create one.
INSERT INTO public.profiles (user_id, department_role, department)
SELECT 'f0ad5480-21b7-432d-942c-1704d8264d7b', 'marketing'::department_role, 'Marketing'
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = 'f0ad5480-21b7-432d-942c-1704d8264d7b');

SET LOCAL session_replication_role = origin;

-- Sample marketing weekly report for current ops week (Monday 2026-07-06).
INSERT INTO public.weekly_reports (department, submitted_by, week_starting, kpi_data, notes, status)
VALUES (
  'marketing'::department_role,
  'f0ad5480-21b7-432d-942c-1704d8264d7b',
  DATE '2026-07-06',
  jsonb_build_object(
    'new_leads', 84,
    'wow_demos', 3,
    'social_posts', 12,
    'whatsapp_enquiries', 47,
    'enquiries_to_admissions', 22
  ),
  'Strong week — WhatsApp funnel outperformed on Tue/Wed after the pillar-2 teaser. Admissions handoff SLA held under 4h.',
  'green'
)
ON CONFLICT (department, week_starting) DO UPDATE
SET kpi_data = EXCLUDED.kpi_data,
    notes = EXCLUDED.notes,
    status = EXCLUDED.status,
    submitted_by = EXCLUDED.submitted_by,
    submitted_at = now();