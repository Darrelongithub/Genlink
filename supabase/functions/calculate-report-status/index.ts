// Calculates green/amber/red status for a weekly_reports row based on kpi_targets.
// Client invokes this after inserting/updating a report; function writes the
// status back with the service role.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TrafficLight = "green" | "amber" | "red";

function worstOf(values: TrafficLight[]): TrafficLight {
  if (values.includes("red")) return "red";
  if (values.includes("amber")) return "amber";
  return "green";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { report_id } = await req.json();
    if (!report_id || typeof report_id !== "string") {
      return json({ error: "report_id required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: report, error: rErr } = await admin
      .from("weekly_reports")
      .select("id, department, kpi_data")
      .eq("id", report_id)
      .maybeSingle();
    if (rErr || !report) return json({ error: "report not found" }, 404);

    const kpi = (report.kpi_data ?? {}) as Record<string, unknown>;
    let status: TrafficLight;

    if (report.department === "tech") {
      const statuses: TrafficLight[] = [
        kpi.website_status, kpi.payment_status, kpi.lms_status, kpi.ai_status,
      ].map((v) => (v === "red" || v === "amber" || v === "green" ? v : "amber")) as TrafficLight[];
      status = worstOf(statuses);
    } else {
      const { data: targets, error: tErr } = await admin
        .from("kpi_targets")
        .select("kpi_key, target_value, comparison")
        .eq("department", report.department);
      if (tErr) return json({ error: tErr.message }, 500);

      let below = 0;
      for (const t of targets ?? []) {
        const raw = kpi[t.kpi_key];
        const val = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isFinite(val)) { below++; continue; }
        const target = Number(t.target_value);
        const fails = t.comparison === "lte" ? val > target : val < target;
        if (fails) below++;
      }
      status = below === 0 ? "green" : below === 1 ? "amber" : "red";
    }

    const { error: uErr } = await admin
      .from("weekly_reports")
      .update({ status })
      .eq("id", report.id);
    if (uErr) return json({ error: uErr.message }, 500);

    return json({ status });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}