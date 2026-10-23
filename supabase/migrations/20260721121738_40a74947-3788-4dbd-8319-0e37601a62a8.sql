
-- 1. Revoke public EXECUTE on SECURITY DEFINER functions so they can't be called via the Data API
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_ops_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_department_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_ceo_or_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_department_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_pending_role_on_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_team_roster() FROM PUBLIC, anon;

-- list_team_roster is invoked by authenticated users via RPC; internal check enforces CEO/admin.
GRANT EXECUTE ON FUNCTION public.list_team_roster() TO authenticated;

-- 2. Ensure profile department_role cannot be self-updated: guard trigger must be attached.
DROP TRIGGER IF EXISTS guard_profile_department_role_trg ON public.profiles;
CREATE TRIGGER guard_profile_department_role_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_department_role();

-- 3. kpi_targets: ensure insert/update restricted to CEO/admin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kpi_targets' AND policyname='Only CEO or admin can manage kpi_targets') THEN
    EXECUTE $p$CREATE POLICY "Only CEO or admin can manage kpi_targets" ON public.kpi_targets
      FOR ALL TO authenticated
      USING (public.is_ceo_or_admin(auth.uid()))
      WITH CHECK (public.is_ceo_or_admin(auth.uid()))$p$;
  END IF;
END $$;
