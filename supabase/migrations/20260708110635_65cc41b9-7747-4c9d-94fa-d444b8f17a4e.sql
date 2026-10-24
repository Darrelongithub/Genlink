
CREATE TYPE public.department_role AS ENUM (
  'ceo','ops_manager','marketing','curriculum','digital_services','finance','tech'
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department_role public.department_role,
  ADD COLUMN IF NOT EXISTS department text;

-- Canonical role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role);
$$;

CREATE OR REPLACE FUNCTION public.has_ops_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id=_user_id AND department_role IS NOT NULL)
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin'::app_role,'moderator'::app_role));
$$;

CREATE OR REPLACE FUNCTION public.get_department_role(_user_id uuid)
RETURNS public.department_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT department_role FROM public.profiles WHERE user_id=_user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ops_submission_open(_week_starting date)
RETURNS boolean LANGUAGE sql STABLE
AS $$
  SELECT (now() AT TIME ZONE 'Africa/Nairobi')
         < ((_week_starting + INTERVAL '4 days 17 hours')::timestamp);
$$;

CREATE TABLE public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department public.department_role NOT NULL,
  submitted_by uuid NOT NULL,
  week_starting date NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  kpi_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  attachment_url text,
  attachment_name text,
  status text CHECK (status IN ('green','amber','red')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department, week_starting)
);
CREATE INDEX weekly_reports_week_idx ON public.weekly_reports (week_starting DESC);
CREATE INDEX weekly_reports_dept_idx ON public.weekly_reports (department);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_reports TO authenticated;
GRANT ALL ON public.weekly_reports TO service_role;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops team reads all reports" ON public.weekly_reports FOR SELECT TO authenticated
  USING (public.has_ops_access(auth.uid()));
CREATE POLICY "Users insert own dept current report" ON public.weekly_reports FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid()
      AND department = public.get_department_role(auth.uid())
      AND public.ops_submission_open(week_starting));
CREATE POLICY "Users update own dept current report" ON public.weekly_reports FOR UPDATE TO authenticated
  USING (department = public.get_department_role(auth.uid()) AND public.ops_submission_open(week_starting))
  WITH CHECK (department = public.get_department_role(auth.uid()) AND public.ops_submission_open(week_starting));
CREATE POLICY "Admins delete reports" ON public.weekly_reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER weekly_reports_updated_at BEFORE UPDATE ON public.weekly_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.kpi_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department public.department_role NOT NULL,
  kpi_key text NOT NULL,
  target_value numeric NOT NULL,
  comparison text NOT NULL DEFAULT 'gte' CHECK (comparison IN ('gte','lte')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department, kpi_key)
);
GRANT SELECT ON public.kpi_targets TO authenticated;
GRANT ALL ON public.kpi_targets TO service_role;
ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops team reads KPI targets" ON public.kpi_targets FOR SELECT TO authenticated
  USING (public.has_ops_access(auth.uid()));
CREATE POLICY "Admins manage KPI targets" ON public.kpi_targets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER kpi_targets_updated_at BEFORE UPDATE ON public.kpi_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.kpi_targets (department, kpi_key, target_value, comparison) VALUES
  ('marketing','new_leads',20,'gte'),
  ('marketing','wow_demos',2,'gte'),
  ('marketing','social_posts',5,'gte'),
  ('marketing','whatsapp_enquiries',15,'gte'),
  ('marketing','enquiries_to_admissions',10,'gte'),
  ('curriculum','active_students',50,'gte'),
  ('curriculum','completion_rate',70,'gte'),
  ('curriculum','attendance_rate',80,'gte'),
  ('curriculum','at_risk_students',5,'lte'),
  ('curriculum','content_upload_pct',60,'gte'),
  ('digital_services','revenue_kes',50000,'gte'),
  ('digital_services','clients_served',10,'gte'),
  ('digital_services','upsell_enquiries',3,'gte'),
  ('digital_services','genlink_web_enquiries',3,'gte'),
  ('digital_services','satisfaction_avg',4.0,'gte'),
  ('finance','revenue_kes',150000,'gte'),
  ('finance','outstanding_invoices',5,'lte'),
  ('finance','budget_variance_pct',-10,'gte'),
  ('finance','cash_ratio',1.2,'gte'),
  ('tech','content_upload_pct',60,'gte'),
  ('ops_manager','lead_pipeline',50,'gte'),
  ('ops_manager','lead_to_enquiry_pct',30,'gte'),
  ('ops_manager','enquiry_to_enrolment_pct',20,'gte'),
  ('ops_manager','active_students',50,'gte'),
  ('ops_manager','open_issues',5,'lte');

CREATE TABLE public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_department public.department_role,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  created_by uuid NOT NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX issues_open_idx ON public.issues (resolved_at) WHERE resolved_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issues TO authenticated;
GRANT ALL ON public.issues TO service_role;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ops team reads issues" ON public.issues FOR SELECT TO authenticated
  USING (public.has_ops_access(auth.uid()));
CREATE POLICY "Ops manager or admin manages issues" ON public.issues FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.get_department_role(auth.uid()) IN ('ops_manager','ceo'))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.get_department_role(auth.uid()) = 'ops_manager');
CREATE TRIGGER issues_updated_at BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.guard_profile_department_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.department_role IS DISTINCT FROM OLD.department_role
     OR NEW.department IS DISTINCT FROM OLD.department THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins may change department role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_guard_department_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_department_role();
