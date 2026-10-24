import { assertEquals } from "jsr:@std/assert@1";
import { extractActions, resolveAction, ANON_LIMIT, DAILY_LIMIT, type ActionScope } from "./actions.ts";

const learner: ActionScope = { signedIn: true, pillarSlugs: ["civic-leadership"], units: { u1: "civic-leadership" }, hasMyPlan: true, hasBadges: false, continueHref: "/pillar/civic-leadership/unit/u1" };
const visitor: ActionScope = { ...learner, signedIn: false };

Deno.test("at most 2 actions are returned", () => {
  const r = extractActions("Hi\nACTIONS: open_profile, open_my_plan, start_assessment", learner);
  assertEquals(r.actions.length, 2);
  assertEquals(r.reply, "Hi");
});
Deno.test("unknown actions are rejected", () => {
  assertEquals(resolveAction("award_xp", learner), null);
  assertEquals(resolveAction("open_pillar:made-up", learner), null);
});
Deno.test("visitors cannot get learner-only actions", () => {
  assertEquals(resolveAction("open_profile", visitor), null);
  assertEquals(resolveAction("open_unit:u1", visitor), null);
  assertEquals(resolveAction("sign_in", visitor)?.href, "/auth");
});
Deno.test("signed-in users are not offered sign in", () => {
  assertEquals(resolveAction("sign_in", learner), null);
});
Deno.test("badges skipped when no badges page exists", () => {
  assertEquals(resolveAction("open_badges", learner), null);
});
Deno.test("message limits", () => {
  assertEquals(ANON_LIMIT, 5);
  assertEquals(DAILY_LIMIT, 10);
});
import { visitorCapReason, VISITOR_GLOBAL_DAILY_CAP, VISITOR_IP_DAILY_LIMIT } from "./actions.ts";
Deno.test("visitor global daily cap is 300", () => {
  assertEquals(VISITOR_GLOBAL_DAILY_CAP, 300);
  assertEquals(visitorCapReason(299, 0), null);
  assertEquals(visitorCapReason(300, 0), "global");
});
Deno.test("visitor per-IP daily limit blocks", () => {
  assertEquals(visitorCapReason(0, VISITOR_IP_DAILY_LIMIT - 1), null);
  assertEquals(visitorCapReason(0, VISITOR_IP_DAILY_LIMIT), "ip");
});
