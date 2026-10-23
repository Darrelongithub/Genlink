import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DepartmentRole } from "@/lib/ops/departments";

export interface WeeklyReportRow {
  id: string;
  department: DepartmentRole;
  submitted_by: string;
  week_starting: string;
  submitted_at: string;
  kpi_data: Record<string, unknown>;
  notes: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  status: "green" | "amber" | "red" | null;
}

export const useWeeklyReports = (weekStarting: string) => {
  return useQuery({
    queryKey: ["weekly_reports_all", weekStarting],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("week_starting", weekStarting);
      if (error) throw error;
      const byDept: Partial<Record<DepartmentRole, WeeklyReportRow>> = {};
      for (const r of (data ?? []) as WeeklyReportRow[]) byDept[r.department] = r;
      return byDept;
    },
  });
};

export const useDepartmentHistory = (department: DepartmentRole | null, weeks: string[]) => {
  return useQuery({
    queryKey: ["weekly_reports_history", department, weeks],
    queryFn: async () => {
      if (!department) return [] as WeeklyReportRow[];
      const { data, error } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("department", department)
        .in("week_starting", weeks);
      if (error) throw error;
      return (data ?? []) as WeeklyReportRow[];
    },
    enabled: !!department && weeks.length > 0,
  });
};