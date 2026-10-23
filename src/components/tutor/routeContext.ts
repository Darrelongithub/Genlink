import { pillars } from "@/data/courses";

export type RouteName = "home" | "assessment" | "journey" | "pillar" | "unit" | "session" | "my_plan" | "profile" | "badges" | "other";

export interface RouteInfo {
  route_name: RouteName;
  pillar_id?: string;
  unit_id?: string;
  label: string;
}

const HIDDEN = [/^\/auth/, /^\/forgot-password/, /^\/reset-password/, /^\/ops-dashboard/, /^\/dashboard/, /^\/team-management/, /^\/learner-insights/, /^\/admin/];

/** Returns null where the Light Guide is hidden. */
export function resolveRoute(pathname: string): RouteInfo | null {
  if (HIDDEN.some((r) => r.test(pathname))) return null;
  const pillarName = (id?: string) => pillars.find((p) => p.id === id)?.name;
  const m = pathname.match(/^\/pillar\/([^/]+)(?:\/unit\/([^/]+)(?:\/session\/[^/]+)?)?/);
  if (m) {
    const [, pillar_id, unit_id] = m;
    const route_name: RouteName = pathname.includes("/session/") ? "session" : unit_id ? "unit" : "pillar";
    return { route_name, pillar_id, unit_id, label: pillarName(pillar_id) ?? "Pillar" };
  }
  if (pathname === "/") return { route_name: "home", label: "Home" };
  if (pathname.startsWith("/pathway-intelligence")) return { route_name: "assessment", label: "Assessment" };
  if (pathname.startsWith("/journey")) return { route_name: "journey", label: "My Journey" };
  if (pathname.startsWith("/my-plan")) return { route_name: "my_plan", label: "My Plan" };
  if (pathname.startsWith("/profile")) return { route_name: "profile", label: "Profile" };
  if (pathname.startsWith("/badges")) return { route_name: "badges", label: "Badges" };
  return { route_name: "other", label: "Genlink" };
}

export function startersFor(route: RouteName, signedIn: boolean): string[] {
  if (!signedIn) return ["What is Genlink?", "What are the 7 pillars?", "How does the assessment work?"];
  switch (route) {
    case "session": return ["Explain this simply", "Give me a Gidurai example", "Quiz me on this"];
    case "profile": return ["How is my progress calculated?", "What do the tiers mean?", "How do I earn XP?"];
    case "my_plan": return ["Why this order?", "Where should I continue?", "How do I earn XP?"];
    default: return ["Where should I continue?", "How do I earn XP?", "What do the tiers mean?"];
  }
}

export const HINTS: Partial<Record<RouteName, string>> = {
  journey: "Lost? Ask me where to continue or how XP works.",
  pillar: "I can explain how this pillar's units unlock.",
  session: "Stuck on an idea? Tap me and ask.",
  my_plan: "Curious why your plan is in this order? Ask me.",
};
