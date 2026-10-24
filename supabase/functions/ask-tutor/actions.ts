// Navigation-only actions the Light Guide may suggest. Pure logic, unit-tested.
export interface GuideAction { id: string; label: string; href: string }

export interface ActionScope {
  signedIn: boolean;
  pillarSlugs: string[];
  /** unit id -> pillar slug, for units the guide may link to */
  units: Record<string, string>;
  /** resolved "continue" target for signed-in learners */
  continueHref?: string;
  hasMyPlan: boolean;
  hasBadges: boolean;
}

export const MAX_ACTIONS = 2;

export function resolveAction(raw: string, s: ActionScope): GuideAction | null {
  const id = raw.trim();
  const [kind, arg] = id.includes(":") ? [id.slice(0, id.indexOf(":")), id.slice(id.indexOf(":") + 1)] : [id, ""];
  switch (kind) {
    case "continue_learning":
      return s.signedIn ? { id, label: "Continue learning", href: s.continueHref ?? "/journey" } : null;
    case "open_my_plan":
      return s.signedIn && s.hasMyPlan ? { id, label: "Open my plan", href: "/my-plan" } : null;
    case "open_profile":
      return s.signedIn ? { id, label: "Open my profile", href: "/profile" } : null;
    case "open_badges":
      return s.signedIn && s.hasBadges ? { id, label: "View badges", href: "/badges" } : null;
    case "open_pillar":
      return s.pillarSlugs.includes(arg) ? { id, label: "Open pillar", href: `/pillar/${arg}` } : null;
    case "open_unit":
      return s.signedIn && s.units[arg] ? { id, label: "Open unit", href: `/pillar/${s.units[arg]}/unit/${arg}` } : null;
    case "start_assessment":
      return { id, label: "Start the assessment", href: "/pathway-intelligence" };
    case "sign_in":
      return s.signedIn ? null : { id, label: "Sign in", href: "/auth" };
    default:
      return null;
  }
}

/** Splits the model's trailing `ACTIONS: a, b` line off the reply and validates it. */
export function extractActions(text: string, s: ActionScope): { reply: string; actions: GuideAction[] } {
  const m = text.match(/\n?\s*ACTIONS:\s*(.*)\s*$/i);
  const reply = (m ? text.slice(0, m.index) : text).trim();
  const actions: GuideAction[] = [];
  for (const raw of (m?.[1] ?? "").split(",")) {
    if (!raw.trim() || raw.trim().toLowerCase() === "none") continue;
    const a = resolveAction(raw, s);
    if (a && !actions.some((x) => x.href === a.href)) actions.push(a);
    if (actions.length >= MAX_ACTIONS) break;
  }
  return { reply, actions };
}

export const ANON_LIMIT = 5;
export const DAILY_LIMIT = 10;
/** Cost safety for signed-out visitors (per UTC day). */
export const VISITOR_GLOBAL_DAILY_CAP = 300;
export const VISITOR_IP_DAILY_LIMIT = 20;
export function visitorCapReason(globalUsed: number, ipUsed: number): "global" | "ip" | null {
  if (globalUsed >= VISITOR_GLOBAL_DAILY_CAP) return "global";
  if (ipUsed >= VISITOR_IP_DAILY_LIMIT) return "ip";
  return null;
}
