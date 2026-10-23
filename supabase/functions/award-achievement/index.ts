import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Server-side achievement condition checks. The client only sends the achievement id.
async function meetsCondition(
  admin: ReturnType<typeof createClient>,
  user_id: string,
  achievement: { id: string; name: string; badge_type: string; requirement_value: number },
): Promise<boolean> {
  const { name, badge_type, requirement_value } = achievement;

  // XP-based
  if (badge_type === "xp" || /xp/i.test(name)) {
    const { data } = await admin.from("user_xp").select("total_xp").eq("user_id", user_id).maybeSingle();
    return (data?.total_xp ?? 0) >= requirement_value;
  }

  // Streak-based
  if (badge_type === "streak" || /streak/i.test(name)) {
    const { data } = await admin.from("user_xp").select("streak_days").eq("user_id", user_id).maybeSingle();
    return (data?.streak_days ?? 0) >= requirement_value;
  }

  // Module-completion based
  if (badge_type === "completion" || /complete|module|course/i.test(name)) {
    const { count } = await admin
      .from("user_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("completed", true);
    return (count ?? 0) >= requirement_value;
  }

  // Unknown type → never auto-award
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user_id = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { achievement_id } = body ?? {};
    if (typeof achievement_id !== "string" || !achievement_id) {
      return new Response(JSON.stringify({ error: "achievement_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: achievement, error: aErr } = await admin
      .from("achievements")
      .select("id, name, badge_type, requirement_value, xp_reward")
      .eq("id", achievement_id)
      .maybeSingle();
    if (aErr || !achievement) {
      return new Response(JSON.stringify({ error: "Unknown achievement" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already earned?
    const { data: existing } = await admin
      .from("user_achievements")
      .select("id")
      .eq("user_id", user_id)
      .eq("achievement_id", achievement_id)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, already_earned: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eligible = await meetsCondition(admin, user_id, achievement as never);
    if (!eligible) {
      return new Response(JSON.stringify({ ok: false, error: "Conditions not met" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await admin
      .from("user_achievements")
      .insert({ user_id, achievement_id });
    if (insErr) {
      console.error("award-achievement insert error", insErr);
      return new Response(JSON.stringify({ error: "Failed to award achievement" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, achievement_id, xp_reward: achievement.xp_reward }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("award-achievement error", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});