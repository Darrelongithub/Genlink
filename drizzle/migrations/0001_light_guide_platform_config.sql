CREATE TABLE public.xp_rules (
  action_type text PRIMARY KEY,
  label text NOT NULL,
  xp integer NOT NULL CHECK (xp >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.xp_rules TO anon, authenticated;
GRANT ALL ON public.xp_rules TO service_role;
ALTER TABLE public.xp_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "XP rules are public" ON public.xp_rules FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.xp_rules (action_type, label, xp) VALUES
 ('session','Completing a session',50),('reflection','Submitting a reflection',75),
 ('exercise','Completing a session exercise',150),('unit_complete','Completing a whole unit',500),
 ('assessment_complete','Completing the assessment',100),('quiz_pass','Passing a quiz',75),
 ('module_complete','Completing a module',50),('exercise_complete','Completing an exercise',25),
 ('daily_login','Daily login',10),('course_complete','Completing a course',250);

CREATE TABLE public.learner_tiers (
  name text PRIMARY KEY,
  min_xp integer NOT NULL UNIQUE CHECK (min_xp >= 0),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.learner_tiers TO anon, authenticated;
GRANT ALL ON public.learner_tiers TO service_role;
ALTER TABLE public.learner_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tiers are public" ON public.learner_tiers FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.learner_tiers (name, min_xp, description) VALUES
 ('Foundation',0,'Starting out and building core habits'),
 ('Practitioner',2500,'Applying ideas consistently across units'),
 ('Specialist',10000,'Deep competence in at least one pillar'),
 ('Elite',25000,'Sustained mastery across the curriculum');

CREATE TABLE public.anon_tutor_usage (
  session_key text PRIMARY KEY,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.anon_tutor_usage TO service_role;
ALTER TABLE public.anon_tutor_usage ENABLE ROW LEVEL SECURITY;