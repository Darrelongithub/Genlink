import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DepartmentRole } from "@/lib/ops/departments";

export interface DepartmentRoleState {
  departmentRole: DepartmentRole | null;
  department: string | null;
  loading: boolean;
}

export const useDepartmentRole = (): DepartmentRoleState => {
  const { user, loading: authLoading } = useAuth();
  const query = useQuery({
    queryKey: ["departmentRole", user?.id],
    queryFn: async () => {
      if (!user) return { departmentRole: null, department: null };
      const { data, error } = await supabase
        .from("profiles")
        .select("department_role, department")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data) return { departmentRole: null, department: null };
      return {
        departmentRole: (data.department_role ?? null) as DepartmentRole | null,
        department: data.department ?? null,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  return {
    departmentRole: query.data?.departmentRole ?? null,
    department: query.data?.department ?? null,
    loading: authLoading || query.isLoading,
  };
};