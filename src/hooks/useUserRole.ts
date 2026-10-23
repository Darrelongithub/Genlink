import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DepartmentRole } from "@/lib/ops/departments";

export type AppRole = "admin" | "moderator" | "user";

/**
 * Resolves the highest-privilege role for the current user.
 * - admin / moderator  -> "team" (Layer 3 operations nav)
 * - user or no row     -> "student" (Layer 2 learning nav)
 * - not signed in      -> null
 */
export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: async () => {
      if (!user) return [] as AppRole[];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) return [] as AppRole[];
      return (data ?? []).map((r) => r.role as AppRole);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const deptQuery = useQuery({
    queryKey: ["profileDepartmentRole", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("department_role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return null;
      return (data?.department_role ?? null) as DepartmentRole | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const roles = query.data ?? [];
  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");
  const departmentRole = deptQuery.data ?? null;
  const isDepartmentMember = departmentRole !== null;
  // "Team" now covers both admin/moderator and any department_role holder.
  const isTeam = isAdmin || isModerator || isDepartmentMember;

  let tier: "guest" | "student" | "team" = "guest";
  if (user) tier = isTeam ? "team" : "student";

  const deptLabelMap: Record<string, string> = {
    ceo: "CEO",
    ops_manager: "Ops Manager",
    marketing: "Marketing",
    curriculum: "Curriculum",
    digital_services: "Digital Services",
    finance: "Finance",
    tech: "Tech",
  };
  const roleLabel = isAdmin
    ? "Admin"
    : departmentRole
      ? (deptLabelMap[departmentRole] ?? "Team")
      : isModerator
        ? "Curriculum Lead"
        : "Student";

  // Post-login destination: team roles land in ops, students in the journey.
  const landingPath = isTeam ? "/ops-dashboard" : "/journey";

  return {
    tier,
    roles,
    departmentRole,
    isDepartmentMember,
    isAdmin,
    isModerator,
    isTeam,
    roleLabel,
    landingPath,
    loading: authLoading || query.isLoading || deptQuery.isLoading,
  };
};

export const useAchievementCount = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["achievementCount", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("user_achievements")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user,
  });
};