import { DEPARTMENTS, DEPARTMENT_ORDER, type DepartmentRole } from "@/lib/ops/departments";
import { currentWeekISO, formatWeekLabel, isoAddWeeks, pastWeeksISO } from "@/lib/ops/week";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Status = "green" | "amber" | "red" | null | undefined;

const STATUS_COLORS: Record<"green" | "amber" | "red", string> = {
  green: "#12A150",
  amber: "#E0A200",
  red: "#D33232",
};

export function TrafficLight({ status, size = 14, className = "" }: { status: Status; size?: number; className?: string }) {
  const color = status ? STATUS_COLORS[status] : "#C9C4BA";
  return (
    <span
      aria-label={status ? `Status: ${status}` : "No status"}
      className={`inline-block rounded-full ${className}`}
      style={{ width: size, height: size, background: color, boxShadow: `0 0 0 2px ${color}22` }}
    />
  );
}

export function DepartmentBadge({ role, className = "" }: { role: DepartmentRole; className?: string }) {
  const meta = role === "ceo"
    ? { label: "CEO", color: "#C9A84C", textOnColor: "#0D2B55" }
    : DEPARTMENTS[role as keyof typeof DEPARTMENTS];
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${className}`}
      style={{ background: meta.color, color: meta.textOnColor }}
    >
      {meta.label}
    </span>
  );
}

export function DepartmentColorBar({ role }: { role: DepartmentRole }) {
  const meta = role === "ceo" ? null : DEPARTMENTS[role as keyof typeof DEPARTMENTS];
  const color = meta?.color ?? "#C9A84C";
  return <span className="block w-1.5 rounded-full self-stretch" style={{ background: color }} />;
}

export function SubmissionClosedNotice() {
  return (
    <div
      className="rounded-lg p-4 border text-sm"
      style={{ background: "#F5EBDD", borderColor: "#8B4A0033", color: "#8B4A00" }}
    >
      <strong>Submission closed for this week.</strong> Next submission window opens Monday.
    </div>
  );
}

interface WeekSelectorProps {
  value: string;
  onChange: (iso: string) => void;
  weeks?: number;
}
export function WeekSelector({ value, onChange, weeks = 12 }: WeekSelectorProps) {
  const options = pastWeeksISO(weeks);
  const cur = currentWeekISO();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[220px] bg-white border-[#0D2B5533]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((iso) => (
          <SelectItem key={iso} value={iso}>
            {iso === cur ? "This week — " : ""}
            {formatWeekLabel(iso)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Compact 6-dot org-health strip. */
export function OrgHealthDots({ statuses }: { statuses: Partial<Record<DepartmentRole, Status>> }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {DEPARTMENT_ORDER.map((r) => (
        <div key={r} className="flex items-center gap-1.5">
          <TrafficLight status={statuses[r] ?? null} />
          <span className="text-xs text-[#0D2B55]/70">{DEPARTMENTS[r].label}</span>
        </div>
      ))}
    </div>
  );
}

export { isoAddWeeks, currentWeekISO, formatWeekLabel };