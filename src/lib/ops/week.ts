// East Africa Time helpers. Week starts Monday. Submissions close Fri 17:00 EAT.
const EAT_OFFSET_MIN = 3 * 60;

function toEAT(date: Date): Date {
  return new Date(date.getTime() + (date.getTimezoneOffset() + EAT_OFFSET_MIN) * 60000);
}

/** Returns the Monday (as YYYY-MM-DD) of the week containing `date`, in EAT. */
export function weekStartingISO(date: Date = new Date()): string {
  const eat = toEAT(date);
  const day = eat.getUTCDay(); // Sun=0, Mon=1..Sat=6 — we now interpret in UTC because we shifted.
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(eat);
  monday.setUTCDate(eat.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export function currentWeekISO(): string {
  return weekStartingISO(new Date());
}

export function isoAddWeeks(iso: string, weeks: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

/** True if the current EAT time is before Friday 17:00 of `weekStarting`. */
export function submissionOpen(weekStarting: string, now: Date = new Date()): boolean {
  const eatNow = toEAT(now);
  const monday = new Date(weekStarting + "T00:00:00Z");
  const friday5 = new Date(monday.getTime() + (4 * 24 + 17) * 3600_000);
  return eatNow.getTime() < friday5.getTime();
}

/** Format like "Mon 8 Jul 2026". */
export function formatWeekLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/** ISO week number, e.g. "2026-W28". */
export function weekTag(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Last N Mondays including current. */
export function pastWeeksISO(count: number): string[] {
  const cur = currentWeekISO();
  return Array.from({ length: count }, (_, i) => isoAddWeeks(cur, -i));
}