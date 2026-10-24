/**
 * Unit tests for `/engine` presentation console domain, calculator, plan comparison,
 * and browser-storage resilience (`src/lib/engine/console.ts`).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildIllustrativeCsv,
  clearEngineStorage,
  cloneDefaultPlans,
  cloneDefaultRules,
  DEFAULT_PLANS,
  ENGINE_PLANS_KEY,
  ENGINE_RULES_KEY,
  evaluateEstimate,
  formatCount,
  formatDecimal,
  formatKsh,
  LIMITS,
  readEngineStorage,
  sanitizeNumber,
  sanitizePlans,
  sanitizeRules,
  writeEngineStorage,
} from "./console.ts";

test("calculator handles zero inputs cleanly without NaN, Infinity or negative credits", () => {
  const zeroLearners = evaluateEstimate({
    learners: 0,
    activePercent: 70,
    actionsPerWeek: 2,
    weeks: 30,
    averageCredits: 1.5,
    plans: DEFAULT_PLANS,
    selectedPlanId: "starter",
  });
  assert.equal(zeroLearners.activeLearners, 0);
  assert.equal(zeroLearners.estimatedCredits, 0);
  assert.equal(zeroLearners.allocationPercent, 0);
  assert.equal(zeroLearners.perActiveLearnerCredits, 0);
  assert.equal(zeroLearners.overallFit, true);

  const zeroActive = evaluateEstimate({
    learners: 500,
    activePercent: 0,
    actionsPerWeek: 4,
    weeks: 40,
    averageCredits: 2,
    plans: DEFAULT_PLANS,
    selectedPlanId: "core",
  });
  assert.equal(zeroActive.activeLearners, 0);
  assert.equal(zeroActive.estimatedCredits, 0);
  assert.equal(zeroActive.perActiveLearnerCredits, 0);
  assert.equal(zeroActive.overallFit, true);

  // Even when a plan is edited to 0 credits, 0 estimated credits still fits and never divides by zero.
  const zeroPlan = cloneDefaultPlans().map((p) => (p.id === "starter" ? { ...p, credits: 0 } : p));
  const zeroVsZero = evaluateEstimate({
    learners: 50,
    activePercent: 0,
    actionsPerWeek: 0,
    weeks: 0,
    averageCredits: 0,
    plans: zeroPlan,
    selectedPlanId: "starter",
  });
  assert.equal(zeroVsZero.estimatedCredits, 0);
  assert.equal(zeroVsZero.allocationPercent, 0);
  assert.equal(Number.isFinite(zeroVsZero.allocationPercent), true);
  assert.equal(zeroVsZero.overallFit, true);

  // Non-zero demand against a 0-credit plan reports 100% meter width and overAllocated without Infinity.
  const demandVsZeroPlan = evaluateEstimate({
    learners: 50,
    activePercent: 50,
    actionsPerWeek: 1,
    weeks: 10,
    averageCredits: 1,
    plans: zeroPlan,
    selectedPlanId: "starter",
  });
  assert.equal(demandVsZeroPlan.estimatedCredits, 250);
  assert.equal(demandVsZeroPlan.overAllocated, true);
  assert.equal(Number.isFinite(demandVsZeroPlan.allocationPercent), true);
  assert.equal(demandVsZeroPlan.overallFit, false);
});

test("calculator handles decimal, large and invalid inputs without NaN, Infinity or negative results", () => {
  const decimalRes = evaluateEstimate({
    learners: 333,
    activePercent: 66.5,
    actionsPerWeek: 1.25,
    weeks: 12.5,
    averageCredits: 1.75,
    plans: DEFAULT_PLANS,
    selectedPlanId: "plus",
  });
  assert.equal(decimalRes.activeLearners, 221); // round(333 * 0.665) = 221
  assert.equal(decimalRes.estimatedCredits, Math.ceil(221 * 1.25 * 12.5 * 1.75));
  assert.ok(Number.isFinite(decimalRes.estimatedCredits) && decimalRes.estimatedCredits > 0);

  // Overflow / Infinity / negative / NaN / garbage strings clamp or fall back safely.
  const invalidRes = evaluateEstimate({
    learners: "1e309",
    activePercent: "-50",
    actionsPerWeek: "not-a-number",
    weeks: Number.NaN,
    averageCredits: Number.POSITIVE_INFINITY,
    plans: DEFAULT_PLANS,
    selectedPlanId: "unknown-plan",
  });
  assert.equal(invalidRes.learners, LIMITS.learnersMax);
  assert.equal(invalidRes.activePercent, 0);
  assert.equal(invalidRes.estimatedCredits, 0);
  assert.equal(invalidRes.selectedPlan.id, "core");
  assert.equal(Number.isNaN(invalidRes.creditDelta), false);

  assert.equal(formatCount(Number.NaN), "0");
  assert.equal(formatCount(Number.POSITIVE_INFINITY), "0");
  assert.equal(formatCount(-999), "0");
  assert.equal(formatDecimal(Number.NaN), "0");
  assert.equal(formatKsh(-50), "KSh 0");
  assert.equal(sanitizeNumber("-10", { min: 0, max: 100 }).value, 0);
});

test("plan comparison checks both credits and learner cap, and stays accurate after editing plans", () => {
  // 500 learners with tiny credit usage (e.g. 500 credits) still exceeds Starter's 100-learner cap!
  const learnerCapCheck = evaluateEstimate({
    learners: 500,
    activePercent: 10,
    actionsPerWeek: 1,
    weeks: 5,
    averageCredits: 1,
    plans: DEFAULT_PLANS,
    selectedPlanId: "starter",
  });
  assert.equal(learnerCapCheck.estimatedCredits, 250);
  assert.equal(learnerCapCheck.creditsFit, true);
  assert.equal(learnerCapCheck.learnersFit, false);
  assert.equal(learnerCapCheck.overallFit, false);
  assert.equal(learnerCapCheck.verdictTone, "warn");
  assert.match(learnerCapCheck.verdictTitle, /not learner capacity/);
  assert.equal(learnerCapCheck.recommendedPlan?.id, "core");

  // Edit plans so Starter becomes the largest tier ("Enterprise Starter") and Plus is shrunk.
  const editedPlans = cloneDefaultPlans().map((plan) => {
    if (plan.id === "starter") return { ...plan, name: "Campus Custom", credits: 200_000, learners: 2_500 };
    if (plan.id === "plus") return { ...plan, credits: 10_000, learners: 150 };
    return plan;
  });

  const afterEdit = evaluateEstimate({
    learners: 1_200,
    activePercent: 80,
    actionsPerWeek: 2,
    weeks: 30,
    averageCredits: 2,
    plans: editedPlans,
    selectedPlanId: "plus",
  });
  assert.equal(afterEdit.overallFit, false);
  assert.equal(afterEdit.recommendedPlan?.id, "starter");
  assert.match(afterEdit.verdictDetail, /Consider Campus Custom/);

  // When demand exceeds ALL configured plans, never recommend the already-selected failing plan.
  const exceedsAll = evaluateEstimate({
    learners: 5_000,
    activePercent: 100,
    actionsPerWeek: 5,
    weeks: 40,
    averageCredits: 5,
    plans: DEFAULT_PLANS,
    selectedPlanId: "plus",
  });
  assert.equal(exceedsAll.recommendedPlan, null);
  assert.doesNotMatch(exceedsAll.verdictDetail, /Consider Plus/);
  assert.match(exceedsAll.verdictDetail, /Exceeds configured example plans/);
});

test("corrupted localStorage payloads and unavailable storage never crash load, save or reset", () => {
  // 1. Corrupt JSON strings, non-array objects, empty arrays, and NaN/negative fields
  const storeMap = new Map([
    [ENGINE_PLANS_KEY, "{not valid json"],
    [ENGINE_RULES_KEY, JSON.stringify({ oops: true })],
  ]);
  const memoryHost = {
    localStorage: {
      getItem: (k) => (storeMap.has(k) ? storeMap.get(k) : null),
      setItem: (k, v) => storeMap.set(k, v),
      removeItem: (k) => storeMap.delete(k),
    },
  };
  const recovered = readEngineStorage(memoryHost);
  assert.equal(recovered.storageAvailable, true);
  assert.equal(recovered.repaired, true);
  assert.equal(recovered.plans.length, 3);
  assert.equal(recovered.rules.length, 4);

  assert.equal(sanitizePlans([]).repaired, true);
  assert.equal(sanitizePlans([{ id: "core", name: "   ", price: -50, credits: "bad", months: 0, learners: 1e20 }]).repaired, true);
  const fixedCore = sanitizePlans([{ id: "core", name: "   ", price: -50, credits: "bad", months: 0, learners: 1e20 }]).plans[1];
  assert.equal(fixedCore.name, "Core");
  assert.equal(fixedCore.price, 0);
  assert.equal(fixedCore.credits, 25_000);
  assert.equal(fixedCore.months, 1);
  assert.equal(fixedCore.learners, LIMITS.planLearnersMax);
  assert.equal(sanitizeRules([{ id: "explain", credits: -9 }]).rules[0].credits, 0);

  // 2. Unavailable storage: getter throws SecurityError AND setItem/removeItem throw QuotaExceededError
  const blockedHost = {};
  Object.defineProperty(blockedHost, "localStorage", {
    get() {
      throw new Error("SecurityError: The operation is insecure.");
    },
  });
  const fromBlocked = readEngineStorage(blockedHost);
  assert.equal(fromBlocked.storageAvailable, false);
  assert.equal(fromBlocked.plans.length, 3);
  assert.equal(writeEngineStorage(fromBlocked.plans, fromBlocked.rules, blockedHost).persisted, false);
  assert.equal(clearEngineStorage(blockedHost).cleared, false);

  const quotaHost = {
    localStorage: {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    },
  };
  assert.equal(readEngineStorage(quotaHost).storageAvailable, false);
  assert.equal(writeEngineStorage(cloneDefaultPlans(), cloneDefaultRules(), quotaHost).persisted, false);
  assert.equal(clearEngineStorage(quotaHost).cleared, false);
});

test("illustrative CSV export explicitly labels data as non-live presentation examples", () => {
  const evaluation = evaluateEstimate({
    learners: 500,
    activePercent: 70,
    actionsPerWeek: 2,
    weeks: 30,
    averageCredits: 1.5,
    plans: DEFAULT_PLANS,
    selectedPlanId: "core",
  });
  const csv = buildIllustrativeCsv(DEFAULT_PLANS, cloneDefaultRules(), evaluation);
  assert.match(csv, /ILLUSTRATIVE PRESENTATION EXAMPLE ONLY/);
  assert.match(csv, /NOT LIVE USAGE/);
  assert.match(csv, /Learner A \(sample\)/);
});
