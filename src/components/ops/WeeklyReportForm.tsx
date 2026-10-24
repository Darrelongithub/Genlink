import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2 } from "lucide-react";
import { DEPARTMENTS, type DepartmentMeta, type DepartmentRole, type KpiField } from "@/lib/ops/departments";
import type { Json } from "@/integrations/supabase/types";
import { submissionOpen, currentWeekISO } from "@/lib/ops/week";
import { SubmissionClosedNotice, TrafficLight } from "./shared";
import AttachmentUpload from "./AttachmentUpload";

interface Props {
  meta: DepartmentMeta;
  weekStarting?: string;
}

type KpiValues = Record<string, string>;

export default function WeeklyReportForm({ meta, weekStarting = currentWeekISO() }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const open = submissionOpen(weekStarting);

  // Load this week's report for this department (if any)
  const own = useQuery({
    queryKey: ["weekly_reports", meta.role, weekStarting],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("department", meta.role)
        .eq("week_starting", weekStarting)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Load autofill sources (only needed for ops_manager)
  const autoDeps = useMemo(
    () => Array.from(new Set(meta.fields.map((f) => f.autoFrom?.department).filter(Boolean))) as DepartmentRole[],
    [meta],
  );
  const auto = useQuery({
    queryKey: ["weekly_reports_auto", autoDeps, weekStarting],
    queryFn: async () => {
      if (autoDeps.length === 0) return {};
      const { data } = await supabase
        .from("weekly_reports")
        .select("department, kpi_data")
        .eq("week_starting", weekStarting)
        .in("department", autoDeps);
      const map: Record<string, Record<string, unknown>> = {};
      for (const r of data ?? []) map[r.department as string] = (r.kpi_data as Record<string, unknown>) ?? {};
      return map;
    },
    enabled: autoDeps.length > 0,
  });

  const [values, setValues] = useState<KpiValues>({});
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null);

  // Hydrate from existing submission or autofill sources
  useEffect(() => {
    if (own.data) {
      const kpi = (own.data.kpi_data as Record<string, unknown>) ?? {};
      const next: KpiValues = {};
      for (const f of meta.fields) next[f.key] = kpi[f.key] != null ? String(kpi[f.key]) : "";
      setValues(next);
      setNotes(own.data.notes ?? "");
      if (own.data.attachment_url && own.data.attachment_name) {
        setAttachment({ url: own.data.attachment_url, name: own.data.attachment_name });
      }
    } else {
      // seed with autofill defaults
      const next: KpiValues = {};
      for (const f of meta.fields) {
        const src = f.autoFrom ? auto.data?.[f.autoFrom.department]?.[f.autoFrom.key] : undefined;
        next[f.key] = src != null ? String(src) : "";
      }
      setValues(next);
    }
  }, [own.data, auto.data, meta]);

  const setField = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      // Validate required
      for (const f of meta.fields) {
        if (!f.optional && (values[f.key] === "" || values[f.key] == null)) {
          throw new Error(`Please fill: ${f.label}`);
        }
      }
      if (!notes.trim()) throw new Error(`Please fill: ${meta.notesLabel}`);

      // Coerce values
      const kpi: Record<string, Json> = {};
      for (const f of meta.fields) {
        const raw = values[f.key];
        if (f.kind === "status" || f.kind === "text") kpi[f.key] = raw;
        else kpi[f.key] = raw === "" ? null : Number(raw);
      }

      const payload = {
        department: meta.role,
        submitted_by: user.id,
        week_starting: weekStarting,
        kpi_data: kpi,
        notes,
        attachment_url: attachment?.url ?? null,
        attachment_name: attachment?.name ?? null,
        submitted_at: new Date().toISOString(),
      };

      let reportId = own.data?.id;
      if (reportId) {
        const { error } = await supabase.from("weekly_reports").update(payload).eq("id", reportId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("weekly_reports").insert(payload).select("id").single();
        if (error) throw error;
        reportId = data.id;
      }

      // Fire status calc (best-effort)
      try {
        await supabase.functions.invoke("calculate-report-status", { body: { report_id: reportId } });
      } catch { /* ignore */ }

      return reportId;
    },
    onSuccess: () => {
      toast.success("Report submitted.");
      qc.invalidateQueries({ queryKey: ["weekly_reports"] });
      qc.invalidateQueries({ queryKey: ["weekly_reports_all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) {
    return (
      <div className="space-y-4">
        <SubmissionClosedNotice />
        {own.data && (
          <div className="rounded-lg bg-white border p-4 text-sm text-[#0D2B55] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" style={{ color: "#12A150" }} />
            You submitted this week's report
            {own.data.status && <> · <TrafficLight status={own.data.status as "green"|"amber"|"red"} /> <span className="uppercase text-xs">{own.data.status}</span></>}
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 gap-4">
        {meta.fields.map((f) => (
          <FieldRow key={f.key} field={f} value={values[f.key] ?? ""} onChange={(v) => setField(f.key, v)} />
        ))}
      </div>

      <div>
        <Label className="text-sm font-semibold text-[#0D2B55] mb-1 block">{meta.notesLabel} *</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Give context, wins, blockers, and anything the CEO should know."
          className="bg-white"
        />
      </div>

      <div>
        <Label className="text-sm font-semibold text-[#0D2B55] mb-1 block">Attachment (optional)</Label>
        <AttachmentUpload
          department={meta.role}
          weekStarting={weekStarting}
          value={attachment}
          onChange={setAttachment}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={save.isPending}
          className="h-11 px-6"
          style={{ background: meta.color, color: meta.textOnColor }}
        >
          {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {own.data ? "Update submission" : "Submit weekly report"}
        </Button>
        {own.data?.status && (
          <span className="text-sm text-[#0D2B55]/70 flex items-center gap-2">
            <TrafficLight status={own.data.status as "green"|"amber"|"red"} />
            Current status: <strong className="uppercase">{own.data.status}</strong>
          </span>
        )}
      </div>
    </form>
  );
}

function FieldRow({ field, value, onChange }: { field: KpiField; value: string; onChange: (v: string) => void }) {
  const auto = field.autoFrom;
  const readOnly = auto?.readOnly;

  if (field.kind === "status") {
    return (
      <div>
        <Label className="text-sm font-semibold text-[#0D2B55] mb-1 block">
          {field.label} {!field.optional && "*"}
        </Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="bg-white h-11">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="green">🟢 Green</SelectItem>
            <SelectItem value="amber">🟡 Amber</SelectItem>
            <SelectItem value="red">🔴 Red</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  const step = field.kind === "decimal" ? "0.1" : field.kind === "number" || field.kind === "percent" ? "1" : "any";
  return (
    <div>
      <Label className="text-sm font-semibold text-[#0D2B55] mb-1 block">
        {field.label} {!field.optional && "*"}
        {auto && (
          <span className="ml-2 text-[10px] uppercase tracking-wide text-[#0D2B55]/60">
            {readOnly ? "auto (read-only)" : "auto-filled, editable"}
          </span>
        )}
      </Label>
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        min={field.min}
        max={field.max}
        value={value}
        readOnly={readOnly}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white h-11"
      />
    </div>
  );
}

export { DEPARTMENTS };