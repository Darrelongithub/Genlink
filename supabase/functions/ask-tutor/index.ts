import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ANON_LIMIT, DAILY_LIMIT, extractActions, visitorCapReason, type ActionScope } from "./actions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROUTES = ["home", "assessment", "journey", "pillar", "unit", "session", "my_plan", "profile", "badges", "other"];

// Curriculum order (names only — every number comes from the database at call time).
const PILLARS: { slug: string; name: string }[] = [
  { slug: "personal-mastery", name: "Personal Mastery & Mind Renewal" },
  { slug: "financial-intelligence", name: "Financial Intelligence & Income Systems" },
  { slug: "digital-literacy", name: "Digital Literacy & Productivity Systems" },
  { slug: "cybersecurity", name: "Cybersecurity & Digital Protection" },
  { slug: "programming-systems", name: "Programming & Intelligent Systems" },
  { slug: "creator-economy", name: "Creator Economy & Digital Monetisation" },
  { slug: "civic-leadership", name: "Civic Leadership & Governance" },
];

interface TurnMsg { role: "user" | "assistant"; content: string }

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const isUuid = (v?: string) => !!v && /^[0-9a-f-]{36}$/i.test(v);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Signed-in user is optional: visitors get the lighter public guide.
    let user_id: string | null = null;
    const authHeader = req.headers.get("Authorization");
    // Caller-scoped client: get_pillar_access() reads auth.uid(), so visitors get the public view.
    let userClient = createClient(SUPABASE_URL, ANON_KEY);
    if (authHeader && !authHeader.includes(ANON_KEY)) {
      userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data } = await userClient.auth.getUser();
      user_id = data?.user?.id ?? null;
    }

    const body = await req.json().catch(() => ({} as any));
    const message = body?.message;
    if (typeof message !== "string" || !message.trim() || message.length > 2000) {
      return json(400, { error: "message is required (1-2000 chars)" });
    }
    const route_name = ROUTES.includes(body?.route_name) ? body.route_name : "other";
    const pillar_slug = PILLARS.some((p) => p.slug === body?.pillar_id) ? body.pillar_id as string : undefined;
    const unit_id = isUuid(str(body?.unit_id)) ? str(body.unit_id) : undefined;
    const session_id = isUuid(str(body?.session_id)) ? str(body.session_id) : undefined;
    const anon_key = str(body?.anon_session_id, 64);
    const history: TurnMsg[] = Array.isArray(body?.conversation_history)
      ? body.conversation_history.filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
          .slice(-20).map((m: any) => ({ role: m.role, content: m.content.slice(0, 2000) }))
      : [];

    // ---- Rate limits ----
    const today = new Date().toISOString().slice(0, 10);
    let count = 0;
    const limit = user_id ? DAILY_LIMIT : ANON_LIMIT;
    if (user_id) {
      const { data } = await admin.from("tutor_usage").select("message_count").eq("user_id", user_id).eq("usage_date", today).maybeSingle();
      count = data?.message_count ?? 0;
    } else {
      if (!anon_key || anon_key.length < 16) return json(400, { error: "anon_session_id required" });
      const { data } = await admin.from("anon_tutor_usage").select("message_count").eq("session_key", anon_key).maybeSingle();
      count = data?.message_count ?? 0;
    }
    // Visitor cost safety: global daily cap + per-IP daily limit (IP stored only as a salted hash).
    let ipHash: string | null = null;
    let ipUsed = 0;
    if (!user_id) {
      const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${SERVICE_KEY.slice(-16)}:${ip}`));
      ipHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
      const { data: rows } = await admin.from("anon_tutor_ip_usage").select("ip_hash, message_count").eq("usage_date", today);
      const globalUsed = (rows ?? []).reduce((a, r) => a + (r.message_count ?? 0), 0);
      ipUsed = (rows ?? []).find((r) => r.ip_hash === ipHash)?.message_count ?? 0;
      const capped = visitorCapReason(globalUsed, ipUsed);
      if (capped) {
        return json(429, {
          error: "visitor_cap_reached",
          reason: capped,
          message: "The Light Guide is resting for visitors today. Sign in (it's free) to keep chatting.",
        });
      }
    }
    if (count >= limit) {
      return json(429, { error: user_id ? "daily_limit_reached" : "visitor_limit_reached", limit, used: count });
    }
    if (!LOVABLE_API_KEY) return json(503, { error: "tutor_unavailable" });

    // ---- Platform config from real tables ----
    const [{ data: xpRules }, { data: tiers }, { data: badges }, { data: unitRows }, { data: access }] = await Promise.all([
      admin.from("xp_rules").select("label, xp").order("xp"),
      admin.from("learner_tiers").select("name, min_xp, description").order("min_xp"),
      admin.from("achievements").select("name, description, xp_reward"),
      admin.from("units").select("id, pillar_id, title, order_index, track_type, status").neq("status", "hidden"),
      userClient.rpc("get_pillar_access"),
    ]);
    // Lock state comes only from get_pillar_access() — the same source as the Explore page and journey map.
    const accessLine = (access ?? []).map((a: any) =>
      `${a.order_index}. ${a.name}: ${a.state}${a.state === "locked" ? ` (needs ${(a.requirements ?? []).map((r: any) => `Pillar ${r.order_index} at ${r.required_pct}%, currently ${r.current_pct}%`).join("; ")})` : ""}${user_id ? `, progress ${a.progress_pct}%` : ""}`,
    ).join("; ");
    const unitsByPillar = new Map<string, number>();
    for (const u of unitRows ?? []) if (u.track_type === "learning_path" && u.status === "live") unitsByPillar.set(u.pillar_id, (unitsByPillar.get(u.pillar_id) ?? 0) + 1);

    // ---- Page context (titles resolved server-side from ids) ----
    const page: string[] = [`Current page: ${route_name}.`];
    const pillarName = PILLARS.find((p) => p.slug === pillar_slug)?.name;
    if (pillarName) page.push(`Pillar: ${pillarName} (slug ${pillar_slug}).`);
    const unit = unit_id ? (unitRows ?? []).find((u) => u.id === unit_id) : undefined;
    if (unit) page.push(`Unit ${unit.order_index + 1}: ${unit.title} (id ${unit.id}).`);
    if (user_id && session_id) {
      const { data: s } = await admin.from("unit_sessions").select("title, order_index").eq("id", session_id).maybeSingle();
      if (s) page.push(`Session ${s.order_index + 1}: ${s.title}.`);
    }

    // ---- Learner context (signed-in only, from the database, never from the client) ----
    const learner: string[] = [];
    let continueHref: string | undefined;
    if (user_id) {
      const [{ data: profile }, { data: xp }, { data: plan }] = await Promise.all([
        admin.from("profiles").select("full_name").eq("user_id", user_id).maybeSingle(),
        admin.from("user_xp").select("total_xp, streak_days").eq("user_id", user_id).maybeSingle(),
        admin.from("learning_plans").select("pillar_id, unit_order, current_index").eq("user_id", user_id).eq("is_active", true).maybeSingle(),
      ]);
      const first = profile?.full_name?.split(" ")[0];
      const total = xp?.total_xp ?? 0;
      const tier = [...(tiers ?? [])].reverse().find((t) => total >= t.min_xp)?.name;
      if (first) learner.push(`First name: ${first}.`);
      learner.push(`Total XP: ${total}.`, `Tier: ${tier ?? "unknown"}.`, `Streak: ${xp?.streak_days ?? 0} day(s).`);
      if (plan && Array.isArray(plan.unit_order)) {
        const order = plan.unit_order as string[];
        const nextId = order[Math.min(plan.current_index, order.length - 1)];
        const next = (unitRows ?? []).find((u) => u.id === nextId);
        learner.push(`Learning plan: ${PILLARS.find((p) => p.slug === plan.pillar_id)?.name ?? plan.pillar_id}, position ${plan.current_index + 1} of ${order.length}${next ? `, next unit "${next.title}" (id ${next.id})` : ""}.`);
        if (next) continueHref = `/pillar/${next.pillar_id}/unit/${next.id}`;
      } else learner.push("Learning plan: none yet.");
    }

    // ---- Platform guide ----
    const guide = [
      "PLATFORM GUIDE (the only facts you may state):",
      "Genlink School of the Elites is a Kenyan learning platform built on 'cognitive discipline': technology enhances human reasoning. No get-rich-quick promises.",
      "The 7 pillars, in curriculum order: " + PILLARS.map((p, i) => `${i + 1}. ${p.name}${unitsByPillar.get(p.slug) ? ` (${unitsByPillar.get(p.slug)} core units)` : ""}`).join("; ") + ".",
      "Structure: Pillars 1-3 are the compulsory Foundation, taken first. Pillars 4-7 are free-choice Specialisations that open once the Foundation is built. Unit 1 Session 1 of every pillar can be read as a free preview (no XP for previews).",
      (user_id ? "Pillar access for this learner: " : "Pillar access for a new visitor: ") + accessLine + ".",
      "Each unit has sessions. Sessions unlock sequentially: finish one to open the next. Some units are locked until earlier units are done.",
      "XP is awarded automatically by the platform (never by the guide): " + (xpRules ?? []).map((r) => `${r.label}: ${r.xp} XP`).join("; ") + ".",
      "Tiers by total XP: " + (tiers ?? []).map((t) => `${t.name} from ${t.min_xp} XP${t.description ? ` (${t.description})` : ""}`).join("; ") + ".",
      "Streaks count consecutive days with learning activity; missing a day resets the streak to 1.",
      (badges?.length ? "Badges: " + badges.map((b) => `${b.name} — ${b.description} (+${b.xp_reward} XP)`).join("; ") : "Badges: none are configured yet.") + " There is no dedicated badges page yet.",
      "The orientation assessment (Pathway Intelligence, at /pathway-intelligence) profiles how you think and recommends a primary and secondary pillar. It can be retaken anytime from the same page.",
      "Your learning plan (My Plan, /my-plan) is a personalised unit order generated from your assessment; 'Continue Learning' resumes the next unit.",
      "Where things live: Journey map (/journey) shows all pillars and progress; each pillar page lists its units; Profile (/profile) shows your account and assessment.",
    ].join("\n");

    const rules = user_id
      ? [
          "You are the Genlink Light Guide, a warm, wise companion across the whole platform (not just lessons).",
          "When on a session page, help with that session's concepts using Kenya-specific examples.",
        ]
      : [
          "You are the Genlink Light Guide speaking to a signed-out visitor. Explain what Genlink is, the 7 pillars and how the assessment works, then gently nudge them to start the assessment or sign in.",
          "You know nothing personal about this visitor.",
        ];
    const system = [
      ...rules,
      "Only state facts found in the PAGE CONTEXT, LEARNER CONTEXT or PLATFORM GUIDE. If something isn't covered, say you're not sure and suggest contacting the Genlink team.",
      "Never invent features, prices, dates, cohorts or policies; for pricing, dates or cohort details say the team will confirm.",
      "You cannot award XP, enrol anyone or change data — you can only suggest navigation.",
      "Keep answers under 150 words unless asked for more. Professional, warm tone.",
      `Optionally end with one final line 'ACTIONS: ' followed by up to 2 comma-separated ids from: continue_learning, open_my_plan, open_profile, open_pillar:<slug>, open_unit:<unit id>, start_assessment, sign_in. Use 'ACTIONS: none' if no action fits.`,
      "",
      "PAGE CONTEXT:\n" + page.join(" "),
      user_id ? "LEARNER CONTEXT:\n" + learner.join(" ") : "",
      guide,
    ].join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: system }, ...history, { role: "user", content: message }] }),
    });
    if (res.status === 429) return json(503, { error: "busy" });
    if (res.status === 402) return json(503, { error: "credits" });
    if (!res.ok) {
      console.error("gateway error", res.status, await res.text());
      return json(502, { error: "tutor_failed" });
    }
    const data = await res.json();
    const raw: string = (data?.choices?.[0]?.message?.content ?? "").trim() || "I'm here. Could you ask that again?";

    const scope: ActionScope = {
      signedIn: !!user_id,
      pillarSlugs: PILLARS.map((p) => p.slug),
      units: Object.fromEntries((unitRows ?? []).map((u) => [u.id, u.pillar_id])),
      continueHref,
      hasMyPlan: true,
      hasBadges: false,
    };
    const { reply, actions } = extractActions(raw, scope);

    if (user_id) {
      await admin.from("tutor_usage").upsert({ user_id, usage_date: today, message_count: count + 1 }, { onConflict: "user_id,usage_date" });
    } else {
      await admin.from("anon_tutor_usage").upsert({ session_key: anon_key, message_count: count + 1, updated_at: new Date().toISOString() }, { onConflict: "session_key" });
      await admin.from("anon_tutor_ip_usage").upsert({ usage_date: today, ip_hash: ipHash, message_count: ipUsed + 1, updated_at: new Date().toISOString() }, { onConflict: "usage_date,ip_hash" });
    }

    return json(200, { reply, actions, used: count + 1, limit, remaining: limit - (count + 1) });
  } catch (e) {
    console.error("ask-tutor error", e);
    return json(500, { error: "Unexpected error" });
  }
});
