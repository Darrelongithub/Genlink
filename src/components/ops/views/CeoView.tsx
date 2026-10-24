import { useState } from "react";
import { DEPARTMENTS, DEPARTMENT_ORDER, formatKpi, worstStatus, type DepartmentRole } from "@/lib/ops/departments";
import { useWeeklyReports } from "@/hooks/useOpsReports";
import { WeekSelector, TrafficLight, DepartmentBadge, DepartmentColorBar } from "../shared";
import { currentWeekISO } from "@/lib/ops/week";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileText } from "lucide-react";
import { getSignedUrl } from "../AttachmentUpload";
import { toast } from "sonner";

export default function CeoView() {
  const [week, setWeek] = useState(currentWeekISO());
  const { data: reports, isLoading } = useWeeklyReports(week);
  const [openDept, setOpenDept] = useState<DepartmentRole | null>(null);

  const openDoc = async (path: string) => {
    const url = await getSignedUrl(path);
    if (!url) return toast.error("Could not load file.");
    window.open(url, "_blank", "noopener");
  };

  const combinedTech = (() => {
    const t = reports?.tech;
    if (!t) return null;
    const kpi = t.kpi_data as Record<string, string>;
    return worstStatus([kpi.website_status, kpi.payment_status, kpi.lms_status, kpi.ai_status]);
  })();

  const primaryFor = (dept: DepartmentRole): { label: string; value: string; status: "green"|"amber"|"red"|null; submitted: boolean } => {
    const r = reports?.[dept];
    const meta = DEPARTMENTS[dept as keyof typeof DEPARTMENTS];
    if (!r) return { label: meta.primary.label, value: "Awaiting submission", status: null, submitted: false };
    if (dept === "tech") {
      return { label: "Combined system status", value: (combinedTech ?? "unknown").toUpperCase(), status: combinedTech, submitted: true };
    }
    const val = (r.kpi_data as Record<string, unknown>)[meta.primary.key];
    return {
      label: meta.primary.label,
      value: formatKpi(meta.primary.kind, val),
      status: r.status,
      submitted: true,
    };
  };

  const briefing = reports?.ops_manager?.notes ?? null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#C9A84C]">CEO View</p>
          <h1 className="text-3xl font-serif text-[#0D2B55]">This week at Genlink</h1>
        </div>
        <WeekSelector value={week} onChange={setWeek} />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {DEPARTMENT_ORDER.map((d) => {
          const meta = DEPARTMENTS[d];
          const p = primaryFor(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => setOpenDept(d)}
              className={`text-left rounded-xl border p-4 transition-shadow hover:shadow-md ${p.submitted ? "bg-white" : "bg-[#EFE7D5]/60"}`}
              style={{ borderColor: p.submitted ? `${meta.color}33` : "#C9C4BA" }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <DepartmentBadge role={d} />
                <TrafficLight status={p.status} size={16} />
              </div>
              <div className="text-[11px] uppercase tracking-wide text-[#0D2B55]/60">{p.label}</div>
              <div className="text-xl font-semibold text-[#0D2B55] mt-1 leading-tight">{p.value}</div>
            </button>
          );
        })}
      </div>

      {/* Briefing note */}
      <div className="rounded-xl bg-white p-5 border-l-4 shadow-sm" style={{ borderLeftColor: "#0D2B55" }}>
        <div className="flex items-center gap-2 mb-2">
          <DepartmentBadge role="ops_manager" />
          <h2 className="font-semibold text-[#0D2B55]">CEO Briefing Note</h2>
        </div>
        <p className="text-sm text-[#0D2B55] whitespace-pre-wrap leading-relaxed">
          {briefing ?? <span className="text-[#0D2B55]/50 italic">Operations Manager has not submitted this week.</span>}
        </p>
      </div>

      {/* Per-department summary rows */}
      <div className="space-y-2">
        {DEPARTMENT_ORDER.map((d) => {
          const meta = DEPARTMENTS[d];
          const r = reports?.[d];
          const kpi = (r?.kpi_data as Record<string, unknown>) ?? {};
          const keys = meta.fields.slice(0, 3);
          return (
            <div key={d} className="flex items-stretch gap-3 bg-white rounded-lg border p-3">
              <DepartmentColorBar role={d} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <DepartmentBadge role={d} />
                  <TrafficLight status={r?.status ?? null} />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-1">
                  {keys.map((f) => (
                    <div key={f.key}>
                      <div className="text-[10px] uppercase tracking-wide text-[#0D2B55]/60 truncate">{f.label}</div>
                      <div className="text-sm font-semibold text-[#0D2B55]">{formatKpi(f.kind, kpi[f.key])}</div>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setOpenDept(d)} className="self-center">
                View Full Report
              </Button>
            </div>
          );
        })}
      </div>

      {/* Document library */}
      <section>
        <h2 className="font-semibold text-[#0D2B55] mb-3">Document Library — this week</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {DEPARTMENT_ORDER.filter((d) => reports?.[d]?.attachment_url).map((d) => {
            const r = reports![d]!;
            return (
              <div key={d} className="flex items-center gap-3 rounded-lg border bg-white p-3">
                <DepartmentBadge role={d} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#0D2B55] truncate flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> {r.attachment_name}
                  </div>
                  <div className="text-[11px] text-[#0D2B55]/60">
                    {new Date(r.submitted_at).toLocaleString()}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openDoc(r.attachment_url!)}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Open
                </Button>
              </div>
            );
          })}
          {DEPARTMENT_ORDER.every((d) => !reports?.[d]?.attachment_url) && (
            <div className="text-sm text-[#0D2B55]/60">No attachments yet this week.</div>
          )}
        </div>
      </section>

      {isLoading && <div className="text-sm text-[#0D2B55]/60">Loading…</div>}

      {/* Full-report modal */}
      <Dialog open={!!openDept} onOpenChange={(o) => !o && setOpenDept(null)}>
        <DialogContent className="max-w-2xl">
          {openDept && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DepartmentBadge role={openDept} />
                  <span>Full report — {DEPARTMENTS[openDept as keyof typeof DEPARTMENTS].label}</span>
                </DialogTitle>
              </DialogHeader>
              <FullReport dept={openDept} report={reports?.[openDept] ?? null} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FullReport({ dept, report }: { dept: DepartmentRole; report: any }) {
  const meta = DEPARTMENTS[dept as keyof typeof DEPARTMENTS];
  if (!report) return <div className="text-sm text-[#0D2B55]/60">No submission yet this week.</div>;
  const kpi = (report.kpi_data ?? {}) as Record<string, unknown>;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrafficLight status={report.status} />
        <span className="text-xs uppercase font-semibold text-[#0D2B55]">{report.status ?? "no status"}</span>
        <span className="text-xs text-[#0D2B55]/60 ml-auto">
          Submitted {new Date(report.submitted_at).toLocaleString()}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {meta.fields.map((f) => (
          <div key={f.key} className="rounded-md bg-[#0D2B5508] p-3">
            <div className="text-[11px] uppercase tracking-wide text-[#0D2B55]/60">{f.label}</div>
            <div className="text-sm font-semibold text-[#0D2B55]">{formatKpi(f.kind, kpi[f.key])}</div>
          </div>
        ))}
      </div>
      {report.notes && (
        <div>
          <div className="text-xs uppercase tracking-wide text-[#0D2B55]/60 mb-1">{meta.notesLabel}</div>
          <p className="text-sm whitespace-pre-wrap text-[#0D2B55]">{report.notes}</p>
        </div>
      )}
    </div>
  );
}