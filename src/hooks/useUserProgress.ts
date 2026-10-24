import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useXPReward } from "@/contexts/XPRewardContext";

export interface UserXP {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  streak_days: number;
  last_activity_date: string | null;
}

export interface UserProgress {
  id: string;
  user_id: string;
  module_id: string;
  completed: boolean;
  completed_at: string | null;
  score: number;
  time_spent_seconds: number;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
  module_type: "free" | "premium";
  order_index: number;
  xp_reward: number;
  estimated_minutes: number;
  content: Record<string, unknown>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  badge_type: string;
  icon: string;
  xp_reward: number;
  requirement_value: number;
}

export const useUserXP = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["userXP", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("user_xp")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as UserXP | null;
    },
    enabled: !!user,
  });
};

export const useModules = (courseId?: string) => {
  return useQuery({
    queryKey: ["modules", courseId],
    queryFn: async () => {
      let query = supabase
        .from("modules")
        .select("*")
        .order("order_index", { ascending: true });

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Module[];
    },
  });
};

// Metadata-only listing (no `content` column) — publicly readable so the UI can
// render locked placeholders for modules the viewer is not enrolled in.
export interface ModuleMeta {
  id: string;
  course_id: string;
  title: string;
  description: string;
  module_type: "free" | "premium";
  order_index: number;
  xp_reward: number;
  estimated_minutes: number;
}

export const useModulesMeta = (courseId?: string) => {
  return useQuery({
    queryKey: ["modulesMeta", courseId],
    queryFn: async () => {
      let query = (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> })
        .from("modules_public")
        .select("id,course_id,title,description,module_type,order_index,xp_reward,estimated_minutes")
        .order("order_index", { ascending: true });

      if (courseId) {
        query = (query as unknown as { eq: (c: string, v: string) => typeof query }).eq("course_id", courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ModuleMeta[];
    },
  });
};

export const useEnrollment = (courseId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["enrollment", user?.id, courseId],
    queryFn: async () => {
      if (!user || !courseId) return false;
      const { data, error } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!courseId,
  });
};

export const useUserModuleProgress = (courseId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["userProgress", user?.id, courseId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from("user_progress")
        .select(`
          *,
          modules!inner(course_id)
        `)
        .eq("user_id", user.id);

      if (courseId) {
        query = query.eq("modules.course_id", courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (UserProgress & { modules: { course_id: string } })[];
    },
    enabled: !!user,
  });
};

export const useAchievements = () => {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("xp_reward", { ascending: true });

      if (error) throw error;
      return data as Achievement[];
    },
  });
};

export const useUserAchievements = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["userAchievements", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("user_achievements")
        .select(`
          *,
          achievements(*)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCompleteModule = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { award, level: currentLevel } = useXPReward();

  return useMutation({
    mutationFn: async ({ moduleId, score, timeSpent }: { moduleId: string; score?: number; timeSpent?: number }) => {
      if (!user) throw new Error("Not authenticated");

      // Read-only: module title for the toast. Progress and XP writes happen server-side.
      const { data: module } = await supabase
        .from("modules")
        .select("title")
        .eq("id", moduleId)
        .single();

      // All XP/progress mutations go through the award-xp edge function,
      // which validates the action server-side and writes with the service role.
      const { data, error } = await supabase.functions.invoke("award-xp", {
        body: {
          action_type: "module_complete",
          session_id: moduleId, // idempotency key per module
        },
      });
      if (error) throw error;

      return {
        xpEarned: data?.xp_awarded ?? 0,
        newTotal: data?.total_xp ?? 0,
        newLevel: data?.current_level ?? 1,
        moduleName: module?.title,
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["userProgress"] });
      queryClient.invalidateQueries({ queryKey: ["userXP"] });

      const xp = data.xpEarned ?? 0;
      if (xp > 0) {
        // Spawn the floater from the module card (if rendered with data-module-id).
        const originEl =
          (document.querySelector(
            `[data-module-id="${variables.moduleId}"]`,
          ) as HTMLElement | null) ??
          (document.querySelector("[data-xp-counter]") as HTMLElement | null);

        const newLevel = data.newLevel || calculateLevel(data.newTotal);
        const leveledUp = newLevel > currentLevel;
        award({ amount: xp, originEl, leveledUp, newLevel });
      }

      toast({
        title: `+${data.xpEarned} XP Earned! 🎉`,
        description: `You completed "${data.moduleName}"`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Calculate level from XP
export const calculateLevel = (xp: number) => Math.floor(xp / 500) + 1;

// Calculate XP needed for next level
export const xpToNextLevel = (xp: number) => {
  const currentLevel = calculateLevel(xp);
  const xpForNextLevel = currentLevel * 500;
  return xpForNextLevel - xp;
};

// Calculate progress percentage to next level
export const levelProgress = (xp: number) => {
  const currentLevel = calculateLevel(xp);
  const xpForCurrentLevel = (currentLevel - 1) * 500;
  const xpForNextLevel = currentLevel * 500;
  return ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
};
