import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SessionBlock } from "@/lib/blocks/types";

/**
 * Loads the ordered session_blocks rows for one unit session.
 * Returns an empty array (never null) so callers can decide whether to fall
 * back to the legacy unit_sessions.content JSONB shape.
 */
export function useSessionBlocks(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["session_blocks", sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<SessionBlock[]> => {
      const { data, error } = await (supabase as any)
        .from("session_blocks")
        .select("id, session_id, order_index, block_type, content")
        .eq("session_id", sessionId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SessionBlock[];
    },
  });
}