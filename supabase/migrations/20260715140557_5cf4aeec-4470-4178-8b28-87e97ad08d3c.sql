
-- Helper: is CEO or admin
CREATE OR REPLACE FUNCTION public.is_ceo_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='admin'::app_role
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id=_user_id AND department_role='ceo'::department_role
  );
$$;

-- Pending role assignments (invite by email before user signs up)
CREATE TABLE IF NOT EXISTS public.pending_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  department_role department_role NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_role_assignments TO authenticated;
GRANT ALL ON public.pending_role_assignments TO service_role;

ALTER TABLE public.pending_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO/admin can view pending"
  ON public.pending_role_assignments FOR SELECT TO authenticated
  USING (public.is_ceo_or_admin(auth.uid()));

-- No client writes; edge function uses service role. But allow ceo/admin to delete/insert if needed.
CREATE POLICY "CEO/admin can manage pending"
  ON public.pending_role_assignments FOR ALL TO authenticated
  USING (public.is_ceo_or_admin(auth.uid()))
  WITH CHECK (public.is_ceo_or_admin(auth.uid()));

-- Apply pending role when a matching profile is created
CREATE OR REPLACE FUNCTION public.apply_pending_role_on_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  _email text;
  _role  department_role;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
  IF _email IS NULL THEN RETURN NEW; END IF;
  SELECT department_role INTO _role FROM public.pending_role_assignments WHERE lower(email) = lower(_email);
  IF _role IS NOT NULL THEN
    NEW.department_role := _role;
    DELETE FROM public.pending_role_assignments WHERE lower(email) = lower(_email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_pending_role_before_insert ON public.profiles;
CREATE TRIGGER apply_pending_role_before_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.apply_pending_role_on_profile();

-- Update guard so both admin AND ceo may change department_role directly (for edge-function service-role writes and CEO console operations)
CREATE OR REPLACE FUNCTION public.guard_profile_department_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF NEW.department_role IS DISTINCT FROM OLD.department_role
     OR NEW.department IS DISTINCT FROM OLD.department THEN
    IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
            OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND department_role='ceo'::department_role)) THEN
      RAISE EXCEPTION 'Only admins or CEO may change department role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Allow CEO/admin to update any profile (needed so the edge function's authenticated-client path or direct writes for role assignment work under RLS).
DROP POLICY IF EXISTS "CEO or admin can update any profile" ON public.profiles;
CREATE POLICY "CEO or admin can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_ceo_or_admin(auth.uid()))
  WITH CHECK (public.is_ceo_or_admin(auth.uid()));

-- Allow CEO/admin to view all profiles (for the team roster)
DROP POLICY IF EXISTS "CEO or admin can view all profiles" ON public.profiles;
CREATE POLICY "CEO or admin can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_ceo_or_admin(auth.uid()));

-- Allow CEO/admin to view all user_roles rows
DROP POLICY IF EXISTS "CEO or admin can view all user_roles" ON public.user_roles;
CREATE POLICY "CEO or admin can view all user_roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_ceo_or_admin(auth.uid()));

-- Security-definer function to list team roster (joins auth.users email safely)
CREATE OR REPLACE FUNCTION public.list_team_roster()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  department_role department_role,
  is_admin boolean,
  joined_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    p.full_name,
    p.department_role,
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role='admin'::app_role) AS is_admin,
    u.created_at AS joined_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE public.is_ceo_or_admin(auth.uid())
  ORDER BY u.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_team_roster() TO authenticated;
