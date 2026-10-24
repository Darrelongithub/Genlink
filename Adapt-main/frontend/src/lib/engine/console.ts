/**
 * Pure domain, validation, plan comparison, and resilient browser-storage helpers
 * for the `/engine` operator presentation console.
 *
 * Kept free of React and DOM globals (storage getters accept an optional window-like
 * object) so `npm run test:engine` exercises every edge case directly in Node.
 */

export type EnginePlan = {
  id: string;
  name: string;
  price: number;
  credits: number;
  months: number;
  learners: number;
  accent: string;
};

export type CreditRule = {
  id: string;
  label: string;
  detail: string;
  credits: number;
};

export type EstimatorInputs = {
  learners: number;
  activePercent: number;
  actionsPerWeek: number;
  weeks: number;
  averageCredits: number;
  learnerLimit: number;
};

export type EstimateEvaluation = {
  learners: number;
  activePercent: number;
  activeLearners: number;
  actionsPerWeek: number;
  weeks: number;
  averageCredits: number;
  estimatedCredits: number;
  selectedPlan: EnginePlan;
  creditDelta: number;
  learnerDelta: number;
  creditsFit: boolean;
  learnersFit: boolean;
  overallFit: boolean;
  allocationPercent: number;
  meterWidthPercent: number;
  overAllocated: boolean;
  perActiveLearnerCredits: number;
  recommendedPlan: EnginePlan | null;
  verdictTone: "good" | "warn";
  verdictTitle: string;
  verdictDetail: string;
};

export type ActivitySample = {
  initials: string;
  learner: string;
  action: string;
  credits: number;
  windowLabel: string;
};

export const ENGINE_PLANS_KEY = "adapt:engine-plans";
export const ENGINE_RULES_KEY = "adapt:engine-rules";

export const LIMITS = {
  planPriceMax: 1_000_000_000,
  planCreditsMax: 100_000_000,
  planLearnersMax: 1_000_000,
  planMonthsMin: 1,
  planMonthsMax: 60,
  ruleCreditsMax: 1_000,
  learnersMax: 100_000,
  learnersSliderMax: 3_000,
  activePercentMax: 100,
  actionsPerWeekMax: 100,
  actionsSliderMax: 10,
  weeksMax: 52,
  averageCreditsMax: 100,
  averageCreditsSliderMax: 10,
  learnerLimitMax: 1_000_000,
} as const;

export const DEFAULT_PLANS: readonly EnginePlan[] = [
  { id: "starter", name: "Starter", price: 100_000, credits: 5_000, months: 12, learners: 100, accent: "#1f9d82" },
  { id: "core", name: "Core", price: 300_000, credits: 25_000, months: 12, learners: 500, accent: "#5848d6" },
  { id: "plus", name: "Plus", price: 500_000, credits: 75_000, months: 12, learners: 700, accent: "#c77d14" },
];

export const DEFAULT_RULES: readonly CreditRule[] = [
  { id: "explain", label: "Adapt a concept", detail: "A fresh explanation using the learner’s current evidence", credits: 1 },
  { id: "quiz", label: "Generate a check", detail: "A short, targeted understanding check", credits: 2 },
  { id: "lesson", label: "Personalised lesson", detail: "A complete lesson written for this learner", credits: 5 },
  { id: "assessment", label: "Full assessment", detail: "Diagnosis, grading and updated learner state", credits: 10 },
];

export const DEFAULT_ESTIMATOR: Readonly<EstimatorInputs> = {
  learners: 500,
  activePercent: 70,
  actionsPerWeek: 2,
  weeks: 30,
  averageCredits: 1.5,
  learnerLimit: 50,
};

export const EXAMPLE_ACTIVITY: readonly ActivitySample[] = [
  { initials: "AM", learner: "Learner A (sample)", action: "Adapted explanation", credits: 1, windowLabel: "Sample · T−1m" },
  { initials: "JO", learner: "Learner B (sample)", action: "Understanding check", credits: 2, windowLabel: "Sample · T−3m" },
  { initials: "WK", learner: "Learner C (sample)", action: "Personalised lesson", credits: 5, windowLabel: "Sample · T−8m" },
  { initials: "DK", learner: "Learner D (sample)", action: "Standard course notes & built-in simple mode", credits: 0, windowLabel: "Sample · T−11m" },
];

export function cloneDefaultPlans(): EnginePlan[] {
  return DEFAULT_PLANS.map((plan) => ({ ...plan }));
}

export function cloneDefaultRules(): CreditRule[] {
  return DEFAULT_RULES.map((rule) => ({ ...rule }));
}

/**
 * Coerce an unknown value into a finite number inside [min, max], rounded to `decimals`.
 * Non-numeric, NaN, and negative Infinity resolve to `fallback`; +Infinity clamps to `max`
 * when parsed from numeric overflow strings such as `"1e309"`, or `fallback` when non-numeric.
 */
export function sanitizeNumber(
  raw: unknown,
  { min = 0, max, fallback = min, decimals = 0 }: { min?: number; max: number; fallback?: number; decimals?: number },
): { value: number; clamped: boolean; invalid: boolean } {
  const safeFallback = Math.min(max, Math.max(min, Number.isFinite(fallback) ? fallback : min));
  if (raw === null || raw === undefined || typeof raw === "boolean" || typeof raw === "object") {
    return { value: roundTo(safeFallback, decimals), clamped: false, invalid: true };
  }
  const str = typeof raw === "string" ? raw.trim() : "";
  if (typeof raw === "string" && str === "") {
    return { value: roundTo(min, decimals), clamped: false, invalid: false };
  }
  const parsed = typeof raw === "number" ? raw : Number(str);
  if (Number.isNaN(parsed)) {
    return { value: roundTo(safeFallback, decimals), clamped: false, invalid: true };
  }
  if (parsed === Number.POSITIVE_INFINITY) {
    return { value: roundTo(max, decimals), clamped: true, invalid: false };
  }
  if (parsed === Number.NEGATIVE_INFINITY) {
    return { value: roundTo(min, decimals), clamped: true, invalid: false };
  }
  const clampedVal = Math.min(max, Math.max(min, parsed));
  const rounded = roundTo(clampedVal, decimals);
  // Avoid `-0` in JavaScript arithmetic.
  const clean = Object.is(rounded, -0) ? 0 : rounded;
  return {
    value: clean,
    clamped: clampedVal !== parsed,
    invalid: false,
  };
}

function roundTo(value: number, decimals: number): number {
  if (decimals <= 0) return Math.round(value);
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return new Intl.NumberFormat("en-KE").format(Math.max(0, Math.round(value)));
}

export function formatDecimal(value: number, maxFractionDigits = 2): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(Math.max(0, value));
}

export function formatKsh(value: number): string {
  return `KSh ${formatCount(value)}`;
}

/** Validate and repair stored plan configurations so corrupt localStorage never crashes. */
export function sanitizePlans(raw: unknown): { plans: EnginePlan[]; repaired: boolean } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { plans: cloneDefaultPlans(), repaired: true };
  }
  let repaired = false;
  const byId = new Map<string, Record<string, unknown>>();
  for (const item of raw) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const rec = item as Record<string, unknown>;
      if (typeof rec.id === "string" && rec.id.trim()) {
        byId.set(rec.id.trim(), rec);
      } else {
        repaired = true;
      }
    } else {
      repaired = true;
    }
  }
  if (byId.size === 0) {
    return { plans: cloneDefaultPlans(), repaired: true };
  }

  const plans = DEFAULT_PLANS.map((def) => {
    const candidate = byId.get(def.id);
    if (!candidate) {
      repaired = true;
      return { ...def };
    }
    const rawName = typeof candidate.name === "string" ? candidate.name.trim().slice(0, 40) : "";
    if (!rawName) repaired = true;
    const price = sanitizeNumber(candidate.price, { min: 0, max: LIMITS.planPriceMax, fallback: def.price, decimals: 0 });
    const credits = sanitizeNumber(candidate.credits, { min: 0, max: LIMITS.planCreditsMax, fallback: def.credits, decimals: 0 });
    const months = sanitizeNumber(candidate.months, { min: LIMITS.planMonthsMin, max: LIMITS.planMonthsMax, fallback: def.months, decimals: 0 });
    const learners = sanitizeNumber(candidate.learners, { min: 0, max: LIMITS.planLearnersMax, fallback: def.learners, decimals: 0 });
    if (price.invalid || price.clamped || credits.invalid || credits.clamped || months.invalid || months.clamped || learners.invalid || learners.clamped) {
      repaired = true;
    }
    const accent = typeof candidate.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(candidate.accent) ? candidate.accent : def.accent;
    return {
      id: def.id,
      name: rawName || def.name,
      price: price.value,
      credits: credits.value,
      months: months.value,
      learners: learners.value,
      accent,
    };
  });

  if (raw.length !== DEFAULT_PLANS.length) repaired = true;
  return { plans, repaired };
}

/** Validate and repair stored credit rule configurations. */
export function sanitizeRules(raw: unknown): { rules: CreditRule[]; repaired: boolean } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { rules: cloneDefaultRules(), repaired: true };
  }
  let repaired = false;
  const byId = new Map<string, Record<string, unknown>>();
  for (const item of raw) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const rec = item as Record<string, unknown>;
      if (typeof rec.id === "string" && rec.id.trim()) {
        byId.set(rec.id.trim(), rec);
      } else {
        repaired = true;
      }
    } else {
      repaired = true;
    }
  }
  if (byId.size === 0) {
    return { rules: cloneDefaultRules(), repaired: true };
  }

  const rules = DEFAULT_RULES.map((def) => {
    const candidate = byId.get(def.id);
    if (!candidate) {
      repaired = true;
      return { ...def };
    }
    const credits = sanitizeNumber(candidate.credits, {
      min: 0,
      max: LIMITS.ruleCreditsMax,
      fallback: def.credits,
      decimals: 2,
    });
    if (credits.invalid || credits.clamped) repaired = true;
    return {
      id: def.id,
      label: def.label,
      detail: def.detail,
      credits: credits.value,
    };
  });

  if (raw.length !== DEFAULT_RULES.length) repaired = true;
  return { rules, repaired };
}

/**
 * Compute institutional credit demand and compare against configured plans,
 * accounting for BOTH credit pool and configured learner capacity even after
 * plans have been re-ordered or edited.
 */
export function evaluateEstimate(params: {
  learners: unknown;
  activePercent: unknown;
  actionsPerWeek: unknown;
  weeks: unknown;
  averageCredits: unknown;
  plans: readonly EnginePlan[];
  selectedPlanId: string;
}): EstimateEvaluation {
  const safePlans = params.plans.length > 0 ? params.plans : DEFAULT_PLANS;
  const learners = sanitizeNumber(params.learners, {
    min: 0,
    max: LIMITS.learnersMax,
    fallback: DEFAULT_ESTIMATOR.learners,
    decimals: 0,
  }).value;
  const activePercent = sanitizeNumber(params.activePercent, {
    min: 0,
    max: LIMITS.activePercentMax,
    fallback: DEFAULT_ESTIMATOR.activePercent,
    decimals: 1,
  }).value;
  const actionsPerWeek = sanitizeNumber(params.actionsPerWeek, {
    min: 0,
    max: LIMITS.actionsPerWeekMax,
    fallback: DEFAULT_ESTIMATOR.actionsPerWeek,
    decimals: 2,
  }).value;
  const weeks = sanitizeNumber(params.weeks, {
    min: 0,
    max: LIMITS.weeksMax,
    fallback: DEFAULT_ESTIMATOR.weeks,
    decimals: 1,
  }).value;
  const averageCredits = sanitizeNumber(params.averageCredits, {
    min: 0,
    max: LIMITS.averageCreditsMax,
    fallback: DEFAULT_ESTIMATOR.averageCredits,
    decimals: 2,
  }).value;

  const activeLearners = Math.max(0, Math.round((learners * activePercent) / 100));
  const rawEstimate = activeLearners * actionsPerWeek * weeks * averageCredits;
  const estimatedCredits = Number.isFinite(rawEstimate) && rawEstimate > 0 ? Math.ceil(rawEstimate) : 0;

  const selectedPlan = safePlans.find((item) => item.id === params.selectedPlanId) ?? safePlans[1] ?? safePlans[0];
  const planCredits = Math.max(0, Number.isFinite(selectedPlan.credits) ? Math.round(selectedPlan.credits) : 0);
  const planLearners = Math.max(0, Number.isFinite(selectedPlan.learners) ? Math.round(selectedPlan.learners) : 0);

  const creditDelta = planCredits - estimatedCredits;
  const learnerDelta = planLearners - learners;
  const creditsFit = creditDelta >= 0;
  const learnersFit = learnerDelta >= 0;
  const overallFit = creditsFit && learnersFit;

  let allocationPercent = 0;
  let overAllocated = false;
  if (estimatedCredits === 0) {
    allocationPercent = 0;
  } else if (planCredits <= 0) {
    allocationPercent = 100;
    overAllocated = true;
  } else {
    allocationPercent = Math.round((estimatedCredits / planCredits) * 100);
    overAllocated = estimatedCredits > planCredits;
  }
  const meterWidthPercent = Math.min(100, Math.max(0, overAllocated ? 100 : allocationPercent));
  const perActiveLearnerCredits = activeLearners > 0 ? Math.floor(planCredits / activeLearners) : 0;

  // Sort plans by effective capacity so edited plans in any order still recommend accurately.
  const sortedByCapacity = [...safePlans].sort(
    (a, b) => a.credits - b.credits || a.learners - b.learners || a.price - b.price,
  );
  const recommendedPlan =
    sortedByCapacity.find((candidate) => candidate.credits >= estimatedCredits && candidate.learners >= learners) ?? null;

  const suggestion =
    recommendedPlan && recommendedPlan.id !== selectedPlan.id
      ? `Consider ${recommendedPlan.name} (${formatCount(recommendedPlan.credits)} credits, up to ${formatCount(recommendedPlan.learners)} learners) or adjust plan limits.`
      : "Exceeds configured example plans — edit plan capacities above or add a top-up credit allocation.";

  let verdictTone: "good" | "warn" = "good";
  let verdictTitle = "";
  let verdictDetail = "";

  if (overallFit) {
    verdictTone = "good";
    verdictTitle = `${selectedPlan.name} covers this estimate`;
    verdictDetail = `${formatCount(creditDelta)} credits remain as headroom (${formatCount(learners)} of ${formatCount(planLearners)} learners).`;
  } else if (!creditsFit && learnersFit) {
    verdictTone = "warn";
    verdictTitle = `${selectedPlan.name} is short by ${formatCount(Math.abs(creditDelta))} credits`;
    verdictDetail = suggestion;
  } else if (creditsFit && !learnersFit) {
    verdictTone = "warn";
    verdictTitle = `${selectedPlan.name} covers credits, not learner capacity`;
    verdictDetail = `${formatCount(learners)} learners exceeds ${selectedPlan.name}’s ${formatCount(planLearners)}-learner cap by ${formatCount(Math.abs(learnerDelta))}. ${suggestion}`;
  } else {
    verdictTone = "warn";
    verdictTitle = `${selectedPlan.name} is short by ${formatCount(Math.abs(creditDelta))} credits and ${formatCount(Math.abs(learnerDelta))} learners`;
    verdictDetail = suggestion;
  }

  return {
    learners,
    activePercent,
    activeLearners,
    actionsPerWeek,
    weeks,
    averageCredits,
    estimatedCredits,
    selectedPlan,
    creditDelta,
    learnerDelta,
    creditsFit,
    learnersFit,
    overallFit,
    allocationPercent,
    meterWidthPercent,
    overAllocated,
    perActiveLearnerCredits,
    recommendedPlan,
    verdictTone,
    verdictTitle,
    verdictDetail,
  };
}

type StorageProvider = {
  localStorage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
};

function resolveLocalStorage(host?: StorageProvider | null): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
  try {
    const target = host !== undefined ? host : typeof window !== "undefined" ? window : null;
    if (!target) return null;
    const store = target.localStorage;
    if (!store || typeof store.getItem !== "function") return null;
    return store;
  } catch {
    return null;
  }
}

export function readEngineStorage(host?: StorageProvider | null): {
  plans: EnginePlan[];
  rules: CreditRule[];
  storageAvailable: boolean;
  repaired: boolean;
} {
  const store = resolveLocalStorage(host);
  if (!store) {
    return {
      plans: cloneDefaultPlans(),
      rules: cloneDefaultRules(),
      storageAvailable: false,
      repaired: false,
    };
  }
  let plans = cloneDefaultPlans();
  let rules = cloneDefaultRules();
  let repaired = false;
  let storageAvailable = true;

  try {
    const rawPlans = store.getItem(ENGINE_PLANS_KEY);
    if (rawPlans !== null) {
      const parsed = JSON.parse(rawPlans);
      const checked = sanitizePlans(parsed);
      plans = checked.plans;
      if (checked.repaired) repaired = true;
    }
  } catch (err) {
    if (isStorageAccessError(err)) storageAvailable = false;
    else repaired = true;
  }

  try {
    const rawRules = store.getItem(ENGINE_RULES_KEY);
    if (rawRules !== null) {
      const parsed = JSON.parse(rawRules);
      const checked = sanitizeRules(parsed);
      rules = checked.rules;
      if (checked.repaired) repaired = true;
    }
  } catch (err) {
    if (isStorageAccessError(err)) storageAvailable = false;
    else repaired = true;
  }

  return { plans, rules, storageAvailable, repaired };
}

export function writeEngineStorage(
  plans: readonly EnginePlan[],
  rules: readonly CreditRule[],
  host?: StorageProvider | null,
): { persisted: boolean } {
  const store = resolveLocalStorage(host);
  if (!store) return { persisted: false };
  try {
    store.setItem(ENGINE_PLANS_KEY, JSON.stringify(plans));
    store.setItem(ENGINE_RULES_KEY, JSON.stringify(rules));
    return { persisted: true };
  } catch {
    return { persisted: false };
  }
}

export function clearEngineStorage(host?: StorageProvider | null): { cleared: boolean } {
  const store = resolveLocalStorage(host);
  if (!store) return { cleared: false };
  try {
    store.removeItem(ENGINE_PLANS_KEY);
    store.removeItem(ENGINE_RULES_KEY);
    return { cleared: true };
  } catch {
    return { cleared: false };
  }
}

function isStorageAccessError(err: unknown): boolean {
  return !(err instanceof SyntaxError);
}

/** Generate an explicitly labelled illustrative CSV summary for presentations. */
export function buildIllustrativeCsv(
  plans: readonly EnginePlan[],
  rules: readonly CreditRule[],
  evaluation: EstimateEvaluation,
): string {
  const csvCell = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
  const lines = [
    ["NOTICE", "ILLUSTRATIVE PRESENTATION EXAMPLE ONLY - NOT LIVE USAGE, NOT AN INVOICE, NO INSTITUTION CONNECTED"].map(csvCell).join(","),
    [],
    ["Section", "Item", "Value", "Notes"].map(csvCell).join(","),
    ["Estimator (Example)", "Total learners", evaluation.learners, "Configured assumption"].map(csvCell).join(","),
    ["Estimator (Example)", "Active learners", `${evaluation.activeLearners} (${evaluation.activePercent}%)`, "Configured assumption"].map(csvCell).join(","),
    ["Estimator (Example)", "Estimated annual Adapt Credits", evaluation.estimatedCredits, evaluation.verdictTitle].map(csvCell).join(","),
    ...plans.map((p) =>
      ["Example Plan", p.name, formatKsh(p.price), `${formatCount(p.credits)} credits / ${p.months} months / up to ${formatCount(p.learners)} learners`]
        .map(csvCell)
        .join(","),
    ),
    ...rules.map((r) => ["Example Credit Rule", r.label, `${r.credits} credits`, r.detail].map(csvCell).join(",")),
    ...EXAMPLE_ACTIVITY.map((a) =>
      ["Sample Activity Row", a.learner, `${a.credits} credits`, `${a.action} (${a.windowLabel})`].map(csvCell).join(","),
    ),
  ];
  return lines.join("\n") + "\n";
}
