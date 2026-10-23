import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PillarRequirement {
  pillar_id: string;
  name: string;
  order_index: number;
  required_pct: number;
  current_pct: number;
  met: boolean;
}

export interface PillarAccess {
  pillar_id: string;
  name: string;
  track: "foundation" | "specialisation";
  order_index: number;
  state: "open" | "locked";
  enrolled: boolean;
  unlock_source: string | null;
  progress_pct: number;
  /** Unmet requirements only. */
  requirements: PillarRequirement[];
  preview_unit_id: string | null;
}

/** The single source for pillar lock state (Explore page, journey map, pillar pages). */
export function usePillarAccess() {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ["pillar_access", user?.id ?? "anon"],
    enabled: !loading,
    queryFn: async (): Promise<PillarAccess[]> => {
      const { data, error } = await (supabase as any).rpc("get_pillar_access");
      if (error) throw error;
      return (data ?? []) as PillarAccess[];
    },
  });
}

export const previewHref = (a: Pick<PillarAccess, "pillar_id" | "preview_unit_id">) =>
  a.preview_unit_id ? `/pillar/${a.pillar_id}/unit/${a.preview_unit_id}/session/1` : `/pillar/${a.pillar_id}`;

export const requirementLabel = (reqs: PillarRequirement[]) =>
  reqs.map((r) => `Pillar ${r.order_index}: ${r.current_pct}% of ${r.required_pct}%`).join(", ");
