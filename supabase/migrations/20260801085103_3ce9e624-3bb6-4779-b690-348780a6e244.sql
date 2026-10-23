CREATE TABLE public.learning_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pillar_id text NOT NULL,
  unit_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  reasoning text,
  current_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.learning_plans TO authenticated;
GRANT ALL ON public.learning_plans TO service_role;

ALTER TABLE public.learning_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own plans"
  ON public.learning_plans FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_ceo_or_admin(auth.uid()));

CREATE POLICY "Users create their own plans"
  ON public.learning_plans FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update their own plans"
  ON public.learning_plans FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_learning_plans_updated_at
  BEFORE UPDATE ON public.learning_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_learning_plans_user ON public.learning_plans(user_id);

CREATE OR REPLACE FUNCTION public.list_learner_insights()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  pillar_id text,
  units_completed bigint,
  total_xp integer,
  last_activity date
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    p.full_name,
    lp.pillar_id,
    (SELECT count(*) FROM public.user_unit_progress up
      WHERE up.user_id = u.id AND up.completed_at IS NOT NULL) AS units_completed,
    COALESCE(x.total_xp, 0) AS total_xp,
    x.last_activity_date AS last_activity
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_xp x ON x.user_id = u.id
  LEFT JOIN public.learning_plans lp ON lp.user_id = u.id AND lp.is_active
  WHERE public.is_ceo_or_admin(auth.uid())
  ORDER BY x.last_activity_date DESC NULLS LAST, u.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_learner_insights() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_learner_insights() TO authenticated;