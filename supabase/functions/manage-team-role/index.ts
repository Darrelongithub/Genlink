import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROLES = ["ceo", "ops_manager", "marketing", "curriculum", "digital_services", "finance", "tech"] as const;
type DeptRole = typeof ROLES[number];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const caller_id = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Authorize: caller must be admin OR have ceo department_role
    const [{ data: rolesRow }, { data: profRow }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", caller_id),
      admin.from("profiles").select("department_role").eq("user_id", caller_id).maybeSingle(),
    ]);
    const isAdmin = (rolesRow ?? []).some((r: { role: string }) => r.role === "admin");
    const isCeo = profRow?.department_role === "ceo";
    if (!isAdmin && !isCeo) return json({ error: "Forbidden — CEO or admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const target_user_id = typeof body.target_user_id === "string" ? body.target_user_id : null;
    const target_email = typeof body.target_email === "string" ? body.target_email.trim().toLowerCase() : null;
    // department_role can be one of ROLES or null (to clear)
    const raw = body.department_role;
    const newRole: DeptRole | null =
      raw === null || raw === "" || raw === "none" ? null : ROLES.includes(raw) ? (raw as DeptRole) : undefined as never;
    if (newRole === undefined) return json({ error: "Invalid department_role" }, 400);

    if (target_user_id) {
      // Direct update on profiles (service role bypasses guard trigger security check because we're admin here anyway)
      const { error } = await admin
        .from("profiles")
        .update({ department_role: newRole })
        .eq("user_id", target_user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, applied: "user", user_id: target_user_id, department_role: newRole });
    }

    if (target_email) {
      // Look up existing auth user by email via admin API
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = list?.users?.find((u) => (u.email ?? "").toLowerCase() === target_email);
      if (match) {
        const { error } = await admin
          .from("profiles")
          .update({ department_role: newRole })
          .eq("user_id", match.id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, applied: "user", user_id: match.id, department_role: newRole });
      }
      // No user yet — upsert pending row
      if (newRole === null) {
        await admin.from("pending_role_assignments").delete().eq("email", target_email);
        return json({ ok: true, applied: "pending_cleared", email: target_email });
      }
      const { error } = await admin.from("pending_role_assignments").upsert(
        { email: target_email, department_role: newRole, invited_by: caller_id },
        { onConflict: "email" },
      );
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, applied: "pending", email: target_email, department_role: newRole });
    }

    return json({ error: "Provide target_user_id or target_email" }, 400);
  } catch (e) {
    console.error("manage-team-role error", e);
    return json({ error: "Unexpected error" }, 500);
  }
});