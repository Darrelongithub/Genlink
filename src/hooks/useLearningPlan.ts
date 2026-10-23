import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { pillars } from "@/data/courses";

// Cast to bypass generated types until DB types regenerate.
const db = supabase as any;

export interface LearningPlan {
  id: string;
  user_id: string;
  pillar_id: string;
  unit_order: string[];
  reasoning: string | null;
  current_index: number;
  is_active: boolean;
}

/** The learner's active, persistent plan (null when none exists yet). */
export function useLearningPlan() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["learning_plan", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LearningPlan | null> => {
      const { data, error } = await db
        .from("learning_plans")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return (data as LearningPlan) ?? null;
    },
  });
}

/**
 * Builds a plan from the learner's assessment recommendation: the primary
 * pillar's learning-path units, in sequence. Idempotent — returns the existing
 * active plan when one is already stored.
 */
export function useGenerateLearningPlan() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<LearningPlan | null> => {
      if (!user) return null;

      const { data: existing } = await db
        .from("learning_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (existing) return existing as LearningPlan;

      const { data: assessment } = await db
        .from("assessment_results")
        .select("primary_pillar_recommended, secondary_pillar_recommended, cognitive_style, execution_preference")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const pillarId: string =
        assessment?.primary_pillar_recommended ?? pillars[0]?.id ?? "personal-mastery";

      const { data: units } = await db
        .from("units")
        .select("id, order_index")
        .eq("pillar_id", pillarId)
        .eq("track_type", "learning_path")
        .order("order_index", { ascending: true });

      const unitOrder = (units ?? []).map((u: any) => u.id);
      const pillarName = pillars.find((p) => p.id === pillarId)?.name ?? pillarId;
      const reasoning = assessment
        ? `Built from your Pathway Intelligence profile — a ${String(
            assessment.cognitive_style,
          ).toLowerCase()} thinker with a ${String(
            assessment.execution_preference,
          ).toLowerCase()} execution style. ${pillarName} is where that profile compounds fastest.`
        : `A sequenced start through ${pillarName}. Complete the Pathway Assessment to personalise it further.`;

      const { data, error } = await db
        .from("learning_plans")
        .insert({
          user_id: user.id,
          pillar_id: pillarId,
          unit_order: unitOrder,
          reasoning,
          current_index: 0,
          is_active: true,
        })
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data as LearningPlan) ?? null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning_plan"] });
    },
  });
}

/** Advances (or rewinds) the plan pointer, e.g. after finishing a unit. */
export function useAdvancePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, index }: { planId: string; index: number }) => {
      const { error } = await db
        .from("learning_plans")
        .update({ current_index: index })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learning_plan"] }),
  });
}

export interface LearnerInsight {
  user_id: string;
  email: string;
  full_name: string | null;
  pillar_id: string | null;
  units_completed: number;
  total_xp: number;
  last_activity: string | null;
}

/** Staff-only learner activity report (CEO / admin gated inside the database). */
export function useLearnerInsights() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["learner_insights", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LearnerInsight[]> => {
      const { data, error } = await db.rpc("list_learner_insights");
      if (error) throw error;
      return (data as LearnerInsight[]) ?? [];
    },
  });
}
