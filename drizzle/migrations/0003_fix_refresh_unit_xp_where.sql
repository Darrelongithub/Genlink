CREATE OR REPLACE FUNCTION public.refresh_unit_xp_totals()
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  UPDATE public.units u SET total_xp = COALESCE((
    SELECT COUNT(*) FILTER (WHERE true) * COALESCE((SELECT xp FROM xp_rules WHERE action_type='session'),0)
    FROM unit_sessions s WHERE s.unit_id = u.id), 0)
  + COALESCE((SELECT COUNT(*) FROM session_blocks b JOIN unit_sessions s ON s.id=b.session_id
      WHERE s.unit_id=u.id AND b.block_type='reflection'),0) * COALESCE((SELECT xp FROM xp_rules WHERE action_type='reflection'),0)
  + COALESCE((SELECT COUNT(*) FROM session_blocks b JOIN unit_sessions s ON s.id=b.session_id
      WHERE s.unit_id=u.id AND b.block_type='exercise'),0) * COALESCE((SELECT xp FROM xp_rules WHERE action_type='exercise'),0)
  + COALESCE((SELECT xp FROM xp_rules WHERE action_type='unit_complete'),0)
  WHERE u.id IS NOT NULL;
$function$;