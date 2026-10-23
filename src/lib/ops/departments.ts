import type { Database } from "@/integrations/supabase/types";

export type DepartmentRole = Database["public"]["Enums"]["department_role"];

export type KpiKind = "number" | "percent" | "currency" | "decimal" | "status" | "text";

export interface KpiField {
  key: string;
  label: string;
  kind: KpiKind;
  optional?: boolean;
  min?: number;
  max?: number;
  autoFrom?: { department: DepartmentRole; key: string; readOnly?: boolean };
  placeholder?: string;
}

export interface DepartmentMeta {
  role: DepartmentRole;
  label: string;
  color: string;
  softBg: string; // faint bg tint
  textOnColor: string;
  fields: KpiField[];
  notesLabel: string;
  primary: { key: string; label: string; kind: KpiKind };
}

export const DEPARTMENTS: Record<Exclude<DepartmentRole, "ceo">, DepartmentMeta> = {
  ops_manager: {
    role: "ops_manager",
    label: "Operations",
    color: "#0D2B55",
    softBg: "#E8EEF6",
    textOnColor: "#FFFFFF",
    notesLabel: "CEO Briefing Note — Justin reads this first",
    primary: { key: "open_issues", label: "Open issues", kind: "number" },
    fields: [
      { key: "lead_pipeline", label: "Total lead pipeline count", kind: "number", autoFrom: { department: "marketing", key: "new_leads" } },
      { key: "lead_to_enquiry_pct", label: "Lead → enquiry conversion (%)", kind: "percent" },
      { key: "enquiry_to_enrolment_pct", label: "Enquiry → enrolment conversion (%)", kind: "percent" },
      { key: "active_students", label: "Total active students", kind: "number", autoFrom: { department: "curriculum", key: "active_students" } },
      { key: "weekly_revenue_kes", label: "Total weekly revenue (KES)", kind: "currency", autoFrom: { department: "finance", key: "revenue_kes", readOnly: true } },
      { key: "open_issues", label: "Open issues count", kind: "number" },
    ],
  },
  marketing: {
    role: "marketing",
    label: "Marketing",
    color: "#8B1A4A",
    softBg: "#F4E7EE",
    textOnColor: "#FFFFFF",
    notesLabel: "What happened this week",
    primary: { key: "new_leads", label: "Leads captured this week", kind: "number" },
    fields: [
      { key: "new_leads", label: "New leads captured this week", kind: "number" },
      { key: "wow_demos", label: "Wow Demo events held this month", kind: "number" },
      { key: "social_posts", label: "Social media posts published this week", kind: "number" },
      { key: "whatsapp_enquiries", label: "WhatsApp enquiries received", kind: "number" },
      { key: "enquiries_to_admissions", label: "Enquiries passed to admissions", kind: "number" },
    ],
  },
  curriculum: {
    role: "curriculum",
    label: "Curriculum",
    color: "#0F6B4A",
    softBg: "#E4F1EB",
    textOnColor: "#FFFFFF",
    notesLabel: "Weekly update",
    primary: { key: "active_students", label: "Active enrolled students", kind: "number" },
    fields: [
      { key: "active_students", label: "Active enrolled students", kind: "number" },
      { key: "completion_rate", label: "Average module completion rate (%)", kind: "percent", min: 0, max: 100 },
      { key: "attendance_rate", label: "Attendance rate this week (%)", kind: "percent", min: 0, max: 100 },
      { key: "at_risk_students", label: "Students flagged as at-risk", kind: "number" },
      { key: "content_upload_pct", label: "Content upload progress (% of pillars online)", kind: "percent", min: 0, max: 100 },
    ],
  },
  digital_services: {
    role: "digital_services",
    label: "Digital Services",
    color: "#6B2FA0",
    softBg: "#EEE7F5",
    textOnColor: "#FFFFFF",
    notesLabel: "Weekly update",
    primary: { key: "revenue_kes", label: "Services revenue this week (KES)", kind: "currency" },
    fields: [
      { key: "revenue_kes", label: "Daily services revenue total this week (KES)", kind: "currency" },
      { key: "clients_served", label: "Number of clients served", kind: "number" },
      { key: "upsell_enquiries", label: "Upsell enquiries passed to admissions", kind: "number" },
      { key: "genlink_web_enquiries", label: "gen.link web package enquiries this week", kind: "number" },
      { key: "satisfaction_avg", label: "Client satisfaction rating average (1–5)", kind: "decimal", min: 1, max: 5 },
    ],
  },
  finance: {
    role: "finance",
    label: "Finance",
    color: "#D97706",
    softBg: "#FCEED0",
    textOnColor: "#FFFFFF",
    notesLabel: "Weekly update",
    primary: { key: "revenue_kes", label: "Total revenue this week (KES)", kind: "currency" },
    fields: [
      { key: "revenue_kes", label: "Total revenue collected this week (KES)", kind: "currency" },
      { key: "outstanding_invoices", label: "Outstanding invoices count", kind: "number" },
      { key: "budget_variance_pct", label: "Budget vs actual variance (%, can be negative)", kind: "decimal" },
      { key: "cash_ratio", label: "Cash position vs 30-day obligations ratio (e.g. 1.4)", kind: "decimal" },
    ],
  },
  tech: {
    role: "tech",
    label: "Tech",
    color: "#0E7A8A",
    softBg: "#E1F0F2",
    textOnColor: "#FFFFFF",
    notesLabel: "Weekly update",
    primary: { key: "combined_status", label: "Combined system status", kind: "status" },
    fields: [
      { key: "website_status", label: "Website uptime status", kind: "status" },
      { key: "payment_status", label: "Payment gateway status", kind: "status" },
      { key: "lms_status", label: "LMS availability status", kind: "status" },
      { key: "ai_status", label: "AI agent status", kind: "status" },
      { key: "content_upload_pct", label: "Content upload % complete", kind: "percent", min: 0, max: 100 },
    ],
  },
};

export const DEPARTMENT_ORDER: (keyof typeof DEPARTMENTS)[] = [
  "ops_manager", "marketing", "curriculum", "digital_services", "finance", "tech",
];

export const CEO_GOLD = "#C9A84C";
export const CEO_NAVY = "#0D2B55";
export const OPS_CREAM = "#F9F6F0";

export function departmentMeta(role: DepartmentRole | null | undefined): DepartmentMeta | null {
  if (!role || role === "ceo") return null;
  return DEPARTMENTS[role as keyof typeof DEPARTMENTS] ?? null;
}

export function worstStatus(vals: (string | null | undefined)[]): "green" | "amber" | "red" {
  if (vals.includes("red")) return "red";
  if (vals.includes("amber")) return "amber";
  return "green";
}

export function formatKpi(kind: KpiKind, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (kind === "currency") {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return `KES ${n.toLocaleString("en-KE")}`;
  }
  if (kind === "percent") return `${value}%`;
  if (kind === "decimal") return String(value);
  if (kind === "status") return String(value).toUpperCase();
  return String(value);
}