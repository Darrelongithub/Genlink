import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Tier { name: string; min_xp: number }

/** Tier names/thresholds come only from the learner_tiers table. */
export function useTiers() {
  return useQuery({
    queryKey: ["learner_tiers"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("learner_tiers").select("name,min_xp").order("min_xp");
      if (error) throw error;
      return (data ?? []) as Tier[];
    },
  });
}

export function tierFor(totalXp: number, tiers: Tier[] | undefined): string | null {
  if (!tiers?.length) return null;
  return [...tiers].sort((a, b) => b.min_xp - a.min_xp).find((t) => totalXp >= t.min_xp)?.name ?? null;
}

/**
 * Per-pillar XP: total available (sum of unit totals, which the database derives from
 * xp_rules + session content, plus a pillar_complete bonus if one is configured) and
 * XP the learner has earned.
 */
export function usePillarXp() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pillar_xp", user?.id ?? "anon"],
    queryFn: async () => {
      const [{ data: units }, { data: bonus }, progress] = await Promise.all([
        supabase.from("units").select("id,pillar_id,total_xp,track_type,status,counts_toward_completion"),
        supabase.from("xp_rules").select("xp").eq("action_type", "pillar_complete").maybeSingle(),
        user
          ? supabase.from("user_unit_progress").select("unit_id,xp_earned").eq("user_id", user.id)
          : Promise.resolve({ data: [] as { unit_id: string; xp_earned: number }[] }),
      ]);
      const unitPillar = new Map<string, string>();
      const out: Record<string, { earned: number; total: number }> = {};
      for (const u of units ?? []) {
        unitPillar.set(u.id, u.pillar_id);
        out[u.pillar_id] ??= { earned: 0, total: bonus?.xp ?? 0 };
        if (u.track_type === "learning_path" && u.status === "live" && u.counts_toward_completion)
          out[u.pillar_id].total += u.total_xp ?? 0;
      }
      for (const p of progress.data ?? []) {
        const pid = unitPillar.get(p.unit_id);
        if (pid && out[pid]) out[pid].earned += p.xp_earned ?? 0;
      }
      return out;
    },
  });
}

export function formatPillarXp(x?: { earned: number; total: number }) {
  if (!x) return "— XP";
  return `${x.earned.toLocaleString()} / ${x.total.toLocaleString()} XP`;
}
