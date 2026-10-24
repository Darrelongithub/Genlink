import type { PIEResult } from "@/data/pathwayIntelligence";

export type CognitiveStyle = "Analyst" | "Builder" | "Connector" | "Visionary";
export type ExecutionPreference = "Systematic" | "Instinctive" | "Collaborative";
export type RiskOrientation = "Conservative" | "Calculated" | "Bold";
export type MotivationDriver = "Security" | "Growth" | "Impact" | "Recognition";

export interface PathwayProfile {
  cognitiveStyle: CognitiveStyle;
  executionPreference: ExecutionPreference;
  riskOrientation: RiskOrientation;
  motivationDriver: MotivationDriver;
  primaryPillarId: string;
  secondaryPillarId: string;
  primaryReason: string;
  secondaryReason: string;
  dimensionScores: Record<string, number>;
  dimensionPercentages: Record<string, number>;
}

/**
 * Map a diagnostic dimension to its most aligned pillar.
 */
const dimensionToPillar: Record<string, string> = {
  identity: "personal-mastery",
  growth: "personal-mastery",
  focus: "personal-mastery",
  economic: "financial-intelligence",
  technical: "programming-systems",
  leadership: "civic-leadership",
  civic: "civic-leadership",
  ethics: "civic-leadership",
  risk: "creator-economy",
};

const cognitivePairs: Array<{ style: CognitiveStyle; dims: string[] }> = [
  { style: "Analyst",   dims: ["technical", "focus"] },
  { style: "Builder",   dims: ["economic", "risk"] },
  { style: "Connector", dims: ["leadership", "civic"] },
  { style: "Visionary", dims: ["identity", "growth"] },
];

const motivationPairs: Array<{ driver: MotivationDriver; dims: string[] }> = [
  { driver: "Security",    dims: ["economic", "focus"] },
  { driver: "Growth",      dims: ["growth", "technical"] },
  { driver: "Impact",      dims: ["civic", "ethics"] },
  { driver: "Recognition", dims: ["identity", "leadership"] },
];

const cognitiveReason: Record<CognitiveStyle, string> = {
  Analyst:   "Your instinct is to decompose systems and pursue depth — the disciplines that reward rigorous thinking will compound fastest for you.",
  Builder:   "You think in models, revenue, and momentum. The path that lets you ship, iterate, and own outcomes gives you the most leverage right now.",
  Connector: "You lead by weaving people and ideas together. The pillar that puts you at the centre of teams and communities amplifies your natural strength.",
  Visionary: "Your growth is anchored in identity, purpose and long-horizon thinking. The pillar that starts from the inside out will unlock the rest of the journey.",
};

const motivationTail: Record<MotivationDriver, string> = {
  Security:    "It also gives you the stability you're optimising for.",
  Growth:      "It also compounds the fastest against the growth curve you're pursuing.",
  Impact:      "It also positions you closest to the impact you want to create.",
  Recognition: "It also builds the recognisable expertise your ambition is aimed at.",
};

const bestOf = <T extends { dims: string[] }>(candidates: T[], scores: Record<string, number>): T => {
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const c of candidates) {
    const s = c.dims.reduce((acc, d) => acc + (scores[d] ?? 0), 0);
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return best;
};

export const derivePathwayProfile = (result: PIEResult): PathwayProfile => {
  const { dimensionScores, dimensionPercentages } = result;

  const cognitiveStyle = bestOf(cognitivePairs, dimensionScores).style;
  const motivationDriver = bestOf(motivationPairs, dimensionScores).driver;

  // Execution preference
  const focus = dimensionScores.focus ?? 0;
  const risk = dimensionScores.risk ?? 0;
  const teamScore = (dimensionScores.leadership ?? 0) + (dimensionScores.civic ?? 0);
  let executionPreference: ExecutionPreference = "Systematic";
  if (teamScore > focus && teamScore > risk) executionPreference = "Collaborative";
  else if (risk > focus) executionPreference = "Instinctive";

  // Risk orientation from percentile of risk dimension
  const riskPct = dimensionPercentages.risk ?? 0;
  const riskOrientation: RiskOrientation =
    riskPct >= 55 ? "Bold" : riskPct >= 30 ? "Calculated" : "Conservative";

  // Rank dimensions to pick top-two pillars (deduped)
  const ranked = Object.entries(dimensionScores)
    .sort((a, b) => b[1] - a[1])
    .map(([dim]) => dimensionToPillar[dim])
    .filter(Boolean);

  const primaryPillarId = ranked[0] ?? "personal-mastery";
  const secondaryPillarId = ranked.find((p) => p !== primaryPillarId) ?? "financial-intelligence";

  const primaryReason = `${cognitiveReason[cognitiveStyle]} ${motivationTail[motivationDriver]}`;
  const secondaryReason = `A strong secondary track that reinforces your ${cognitiveStyle.toLowerCase()} orientation without pulling focus from the primary pillar.`;

  return {
    cognitiveStyle,
    executionPreference,
    riskOrientation,
    motivationDriver,
    primaryPillarId,
    secondaryPillarId,
    primaryReason,
    secondaryReason,
    dimensionScores,
    dimensionPercentages,
  };
};