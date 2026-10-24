-- 1. Tiers
DELETE FROM public.learner_tiers;
INSERT INTO public.learner_tiers (name, min_xp, description) VALUES
 ('Seeker',0,NULL),('Steward',2500,NULL),('Builder',10000,NULL),('Architect',35000,NULL),('Sage',90000,NULL);

-- 2. Unit XP totals derived from xp_rules + real session content (no seeded values)
ALTER TABLE public.units ALTER COLUMN total_xp SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.refresh_unit_xp_totals()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.units u SET total_xp = COALESCE((
    SELECT COUNT(*) FILTER (WHERE true) * COALESCE((SELECT xp FROM xp_rules WHERE action_type='session'),0)
    FROM unit_sessions s WHERE s.unit_id = u.id), 0)
  + COALESCE((SELECT COUNT(*) FROM session_blocks b JOIN unit_sessions s ON s.id=b.session_id
      WHERE s.unit_id=u.id AND b.block_type='reflection'),0) * COALESCE((SELECT xp FROM xp_rules WHERE action_type='reflection'),0)
  + COALESCE((SELECT COUNT(*) FROM session_blocks b JOIN unit_sessions s ON s.id=b.session_id
      WHERE s.unit_id=u.id AND b.block_type='exercise'),0) * COALESCE((SELECT xp FROM xp_rules WHERE action_type='exercise'),0)
  + COALESCE((SELECT xp FROM xp_rules WHERE action_type='unit_complete'),0);
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_unit_xp_totals() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_refresh_unit_xp_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.refresh_unit_xp_totals(); RETURN NULL; END $$;
REVOKE EXECUTE ON FUNCTION public.trg_refresh_unit_xp_totals() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER refresh_unit_xp_on_blocks AFTER INSERT OR UPDATE OR DELETE ON public.session_blocks
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_refresh_unit_xp_totals();
CREATE TRIGGER refresh_unit_xp_on_sessions AFTER INSERT OR DELETE ON public.unit_sessions
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_refresh_unit_xp_totals();
CREATE TRIGGER refresh_unit_xp_on_rules AFTER INSERT OR UPDATE OR DELETE ON public.xp_rules
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_refresh_unit_xp_totals();

SELECT public.refresh_unit_xp_totals();

-- 3. Visitor cost caps (per hashed IP per day; global = sum)
CREATE TABLE public.anon_tutor_ip_usage (
  usage_date date NOT NULL,
  ip_hash text NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usage_date, ip_hash)
);
GRANT ALL ON public.anon_tutor_ip_usage TO service_role;
ALTER TABLE public.anon_tutor_ip_usage ENABLE ROW LEVEL SECURITY;