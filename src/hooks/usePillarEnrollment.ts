import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;

/**
 * Whether the current user is enrolled in a given pillar.
 * `enrollments.course_id` is reused as the pillar identifier.
 */
export function usePillarEnrollment(pillarId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pillar_enrollment", user?.id, pillarId],
    enabled: !!user && !!pillarId,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await db
        .from("enrollments")
        .select("id")
        .eq("user_id", user!.id)
        .eq("course_id", pillarId!)
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });
}

/** Whether the current user has completed the Pathway Intelligence assessment. */
export function useHasAssessment() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["has_assessment", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await db
        .from("assessment_results")
        .select("id")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });
}

/** Enrol the current user in a pillar. */
export async function enrollInPillar(userId: string, pillarId: string) {
  return await db.from("enrollments").insert({
    user_id: userId,
    course_id: pillarId,
    progress: 0,
    completed: false,
  });
}