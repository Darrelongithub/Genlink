import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Server-defined points table. The client never sends an XP amount.
const XP_POINTS: Record<string, number> = {
  module_complete: 50,
  quiz_pass: 75,
  exercise_complete: 25,
  daily_login: 10,
  course_complete: 250,
  assessment_complete: 100,
  session: 50,
  reflection: 75,
  exercise: 150,
  unit_complete: 500,
};

// Per-(user, action, session) idempotency guard kept in-memory per isolate.
// For strong guarantees, back this with a DB unique constraint on (user_id, action_type, session_id).
const seen = new Set<string>();

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

    // Validate JWT and resolve the caller's user id from the token (never trust client-sent user_id).
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
    const { action_type, session_id, unit_id } = body ?? {};

    if (typeof action_type !== "string" || typeof session_id !== "string" || !session_id) {
      return new Response(JSON.stringify({ error: "action_type and session_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // xp_rules is the single source of truth; XP_POINTS is a fallback only.
    const { data: rule } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
      .from("xp_rules").select("xp").eq("action_type", action_type).maybeSingle();
    const xp_to_award = rule?.xp ?? XP_POINTS[action_type];
    if (xp_to_award === undefined) {
      return new Response(JSON.stringify({ error: `Unknown action_type: ${action_type}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reader XP (sessions, reflections, exercises, unit bonus) is only for learners enrolled
    // in the unit's pillar. Preview readers (Unit 1 Session 1 of a pillar they haven't
    // unlocked) get no XP.
    const READER_ACTIONS = ["session", "reflection", "exercise", "unit_complete"];
    if (READER_ACTIONS.includes(action_type)) {
      const svc = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: u } = typeof unit_id === "string"
        ? await svc.from("units").select("pillar_id").eq("id", unit_id).maybeSingle()
        : { data: null };
      const { data: enr } = u
        ? await svc.from("enrollments").select("id").eq("user_id", user_id).eq("course_id", u.pillar_id).maybeSingle()
        : { data: null };
      if (!enr) {
        return new Response(JSON.stringify({ ok: true, preview: true, xp_awarded: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const dedupeKey = `${user_id}:${action_type}:${session_id}`;
    if (seen.has(dedupeKey)) {
      return new Response(JSON.stringify({ ok: true, deduped: true, xp_awarded: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    seen.add(dedupeKey);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Update unit progress server-side when a session/unit-complete event arrives.
    if (unit_id && typeof unit_id === "string") {
      const { data: unit } = await admin
        .from("units")
        .select("session_count, total_xp")
        .eq("id", unit_id)
        .maybeSingle();

      const { data: prog } = await admin
        .from("user_unit_progress")
        .select("sessions_completed, xp_earned, last_session_index")
        .eq("user_id", user_id)
        .eq("unit_id", unit_id)
        .maybeSingle();

      let sessionsCompleted = prog?.sessions_completed ?? 0;
      let lastIdx = prog?.last_session_index ?? 0;

      if (action_type === "session") {
        sessionsCompleted = Math.min((unit?.session_count ?? 999), sessionsCompleted + 1);
        lastIdx = sessionsCompleted;
      }

      const xpEarned = (prog?.xp_earned ?? 0) + xp_to_award;
      const completedAt =
        action_type === "unit_complete" || (unit && sessionsCompleted >= unit.session_count)
          ? new Date().toISOString()
          : null;

      await admin.from("user_unit_progress").upsert(
        {
          user_id,
          unit_id,
          sessions_completed: sessionsCompleted,
          last_session_index: lastIdx,
          xp_earned: xpEarned,
          completed_at: completedAt,
        },
        { onConflict: "user_id,unit_id" },
      );
    }

    // Fetch existing row to atomically compute new totals.
    const { data: existing } = await admin
      .from("user_xp")
      .select("total_xp, streak_days, last_activity_date")
      .eq("user_id", user_id)
      .maybeSingle();

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

    let streak = 1;
    if (existing?.last_activity_date === today) streak = existing.streak_days || 1;
    else if (existing?.last_activity_date === yesterday) streak = (existing.streak_days || 0) + 1;

    const newTotal = (existing?.total_xp ?? 0) + xp_to_award;
    const newLevel = Math.floor(newTotal / 500) + 1;

    const { error: upsertErr } = await admin
      .from("user_xp")
      .upsert(
        {
          user_id,
          total_xp: newTotal,
          current_level: newLevel,
          streak_days: streak,
          last_activity_date: today,
        },
        { onConflict: "user_id" },
      );

    if (upsertErr) {
      console.error("award-xp upsert error", upsertErr);
      return new Response(JSON.stringify({ error: "Failed to award XP" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, xp_awarded: xp_to_award, total_xp: newTotal, current_level: newLevel, streak_days: streak }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("award-xp error", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});