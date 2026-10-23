import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Cast to bypass generated types until DB types regenerate.
const db = supabase as any;

export type PillarTheme =
  | "financial" | "communication" | "digital" | "leadership"
  | "entrepreneurship" | "creator" | "civic";

export type TrackType = "learning_path" | "specialized";
export type UnitStatus = "live" | "coming_soon" | "hidden";

export interface Unit {
  id: string;
  pillar_id: string;
  title: string;
  description: string | null;
  order_index: number;
  session_count: number;
  total_xp: number;
  estimated_minutes: number;
  track_type: TrackType;
  theme: PillarTheme;
  is_locked_by_default: boolean;
  status: UnitStatus;
  counts_toward_completion: boolean;
}

export interface UserUnitProgress {
  unit_id: string;
  sessions_completed: number;
  xp_earned: number;
  last_session_index: number;
  completed_at: string | null;
}

export function usePillarUnits(pillarId: string | undefined) {
  return useQuery({
    queryKey: ["units", pillarId],
    enabled: !!pillarId,
    queryFn: async (): Promise<Unit[]> => {
      const { data, error } = await db
        .from("units")
        .select("*")
        .eq("pillar_id", pillarId!)
        .neq("status", "hidden")
        .order("track_type", { ascending: true })
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data as Unit[]) ?? [];
    },
  });
}

export function useUserUnitProgress(unitIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_unit_progress", user?.id, unitIds.join(",")],
    enabled: !!user && unitIds.length > 0,
    queryFn: async (): Promise<Record<string, UserUnitProgress>> => {
      const { data, error } = await db
        .from("user_unit_progress")
        .select("unit_id, sessions_completed, xp_earned, last_session_index, completed_at")
        .in("unit_id", unitIds);
      if (error) throw error;
      const map: Record<string, UserUnitProgress> = {};
      (data ?? []).forEach((r: any) => { map[r.unit_id] = r; });
      return map;
    },
  });
}

export function useUnit(unitId: string | undefined) {
  return useQuery({
    queryKey: ["unit", unitId],
    enabled: !!unitId,
    queryFn: async (): Promise<Unit | null> => {
      const { data, error } = await db
        .from("units").select("*").eq("id", unitId!).maybeSingle();
      if (error) throw error;
      return (data as Unit) ?? null;
    },
  });
}

export interface UnitSession {
  id: string;
  unit_id: string;
  order_index: number;
  title: string;
  summary: string | null;
  content: any[];
}

export function useUnitSessions(unitId: string | undefined) {
  return useQuery({
    queryKey: ["unit_sessions", unitId],
    enabled: !!unitId,
    queryFn: async (): Promise<UnitSession[]> => {
      const { data, error } = await db
        .from("unit_sessions").select("*")
        .eq("unit_id", unitId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data as UnitSession[]) ?? [];
    },
  });
}