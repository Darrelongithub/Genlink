import { useState } from "react";
import { DEPARTMENTS, DEPARTMENT_ORDER, formatKpi, type DepartmentRole } from "@/lib/ops/departments";
import { useWeeklyReports } from "@/hooks/useOpsReports";
import { currentWeekISO } from "@/lib/ops/week";
import { WeekSelector, TrafficLight, DepartmentBadge } from "../shared";
import WeeklyReportForm from "../WeeklyReportForm";
import PipelineFunnel from "../PipelineFunnel";
import IssuesLog from "../IssuesLog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function OpsManagerView() {
  const [week, setWeek] = useState(currentWeekISO());
  const { data: reports } = useWeeklyReports(week);

  const num = (dept: DepartmentRole, key: string): number => {
    const v = (reports?.[dept]?.kpi_data as Record<string, unknown> | undefined)?.[key];
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const stages = [
    { label: "Total Leads", value: num("marketing", "new_leads"), color: "#8B1A4A" },
    { label: "Enquiries", value: num("marketing", "whatsapp_enquiries") + num("digital_services", "upsell_enquiries"), color: "#6B2FA0" },
    { label: "Enrolments", value: num("marketing", "enquiries_to_admissions"), color: "#0D2B55" },
    { label: "Active Students", value: num("curriculum", "active_students"), color: "#0F6B4A" },
    { label: "Graduates", value: num("curriculum", "content_upload_pct"), color: "#C9A84C" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#C9A84C]">Operations Manager</p>
          <h1 className="text-3xl font-serif text-[#0D2B55]">Command centre</h1>
        </div>
        <WeekSelector value={week} onChange={setWeek} />
      </div>

      <Tabs defaultValue="submit">
        <TabsList className="bg-white">
          <TabsTrigger value="submit">My submission</TabsTrigger>
          <TabsTrigger value="departments">All departments</TabsTrigger>
          <TabsTrigger value="funnel">Pipeline</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="mt-4">
          <div className="rounded-xl bg-white p-5 border">
            <WeeklyReportForm meta={DEPARTMENTS.ops_manager} weekStarting={week} />
          </div>
        </TabsContent>

        <TabsContent value="departments" className="mt-4 space-y-3">
          {DEPARTMENT_ORDER.map((d) => {
            const meta = DEPARTMENTS[d];
            const r = reports?.[d];
            const kpi = (r?.kpi_data ?? {}) as Record<string, unknown>;
            return (
              <div key={d} className="rounded-lg border bg-white p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DepartmentBadge role={d} />
                  <TrafficLight status={r?.status ?? null} />
                  <span className="text-xs text-[#0D2B55]/60">
                    {r ? `Submitted ${new Date(r.submitted_at).toLocaleString()}` : "No submission"}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {meta.fields.map((f) => (
                    <div key={f.key} className="rounded-md bg-[#0D2B5508] p-2">
                      <div className="text-[10px] uppercase text-[#0D2B55]/60">{f.label}</div>
                      <div className="text-sm font-semibold text-[#0D2B55]">{formatKpi(f.kind, kpi[f.key])}</div>
                    </div>
                  ))}
                </div>
                {r?.notes && <p className="text-xs text-[#0D2B55]/80 mt-3 whitespace-pre-wrap">{r.notes}</p>}
                {r?.attachment_name && <div className="text-[11px] text-[#0D2B55]/60 mt-2">📎 {r.attachment_name}</div>}
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="funnel" className="mt-4">
          <div className="rounded-xl bg-white p-5 border">
            <h2 className="font-semibold text-[#0D2B55] mb-4">Pipeline funnel — this week</h2>
            <PipelineFunnel stages={stages} />
            <p className="text-xs text-[#0D2B55]/50 mt-3">
              Conversion rate at each stage relative to the previous.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="issues" className="mt-4">
          <IssuesLog canEdit />
        </TabsContent>
      </Tabs>
    </div>
  );
}