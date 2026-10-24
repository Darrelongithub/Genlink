// ─── Genlink Integrated Pathway Intelligence Engine ────────────
// Master cross-pillar diagnostic assessment

export interface PIEDimension {
  id: string;
  label: string;
  description: string;
}

export interface PIEOption {
  label: string;
  value: string;
  weights: Record<string, number>;
}

export interface PIEQuestion {
  id: string;
  section: string;
  scenario: string;
  options: PIEOption[];
}

export interface GenlinkArchetype {
  id: string;
  title: string;
  tagline: string;
  description: string;
  strengths: string[];
  pillarMapping: {
    pillar1Path: string;
    pillar2Path: string;
    pillar3Path: string;
    specialization: string;
    pillar7Integration: string;
  };
  projectedTrajectory: string;
  deepWorkStructure: string;
  economicPositioning: string;
}

export interface PIESection {
  id: string;
  title: string;
  description: string;
  questionIds: string[];
}

// ─── 9 Diagnostic Dimensions ──────────────────────────────────

export const pieDimensions: PIEDimension[] = [
  { id: "identity", label: "Identity Orientation", description: "Self-awareness, purpose clarity, and values alignment" },
  { id: "economic", label: "Economic Motivation", description: "Wealth philosophy, income strategy, and financial ambition" },
  { id: "technical", label: "Technical Aptitude", description: "Comfort with systems, code, data, and technical problem-solving" },
  { id: "leadership", label: "Leadership Inclination", description: "Influence style, team dynamics, and organizational thinking" },
  { id: "civic", label: "Civic Awareness", description: "Community orientation, governance interest, and social responsibility" },
  { id: "focus", label: "Focus Capacity", description: "Deep work ability, sustained attention, and distraction management" },
  { id: "risk", label: "Risk Appetite", description: "Tolerance for uncertainty, experimentation, and calculated risk-taking" },
  { id: "ethics", label: "Ethical Decision Style", description: "Moral reasoning, integrity under pressure, and principled action" },
  { id: "growth", label: "Growth Commitment", description: "Long-term investment in self-improvement and skill compounding" },
];

// ─── Assessment Sections ──────────────────────────────────────

export const pieSections: PIESection[] = [
  {
    id: "behavioral",
    title: "Behavioral Patterns",
    description: "How you naturally respond to challenges, opportunities, and everyday decisions",
    questionIds: ["pie-1", "pie-2", "pie-3", "pie-4", "pie-5", "pie-6", "pie-7", "pie-8", "pie-9", "pie-10"],
  },
  {
    id: "strategic",
    title: "Strategic Preferences",
    description: "How you plan, allocate resources, and position yourself for the future",
    questionIds: ["pie-11", "pie-12", "pie-13", "pie-14", "pie-15", "pie-16", "pie-17", "pie-18", "pie-19", "pie-20"],
  },
  {
    id: "decision",
    title: "Decision-Making Architecture",
    description: "How you process information, weigh trade-offs, and commit to action",
    questionIds: ["pie-21", "pie-22", "pie-23", "pie-24", "pie-25", "pie-26", "pie-27", "pie-28", "pie-29", "pie-30"],
  },
  {
    id: "ambition",
    title: "Long-Term Ambition",
    description: "Your vision for impact, legacy, and the kind of life you're building",
    questionIds: ["pie-31", "pie-32", "pie-33", "pie-34", "pie-35", "pie-36", "pie-37", "pie-38", "pie-39", "pie-40"],
  },
];

// ─── 40 Scenario-Based Questions ──────────────────────────────

export const pieQuestions: PIEQuestion[] = [
  // ── Section 1: Behavioral Patterns ──
  {
    id: "pie-1",
    section: "behavioral",
    scenario: "You discover that a project you've invested months in is built on a flawed assumption. The deadline is next week.",
    options: [
      { label: "Acknowledge the flaw publicly, restructure the project around the correct assumption, even if it means missing the deadline", value: "a", weights: { identity: 3, ethics: 2, growth: 1 } },
      { label: "Find the minimum viable fix that addresses the core flaw while preserving the deadline", value: "b", weights: { focus: 2, technical: 2, risk: 1 } },
      { label: "Delegate the restructuring to team members with the right skills while you manage stakeholder expectations", value: "c", weights: { leadership: 3, economic: 1, focus: 1 } },
      { label: "Use the flaw as a learning case — document it, then decide whether speed or accuracy matters more for this specific context", value: "d", weights: { growth: 3, ethics: 1, identity: 1 } },
    ],
  },
  {
    id: "pie-2",
    section: "behavioral",
    scenario: "A younger colleague asks you to mentor them. You have limited time and multiple competing priorities.",
    options: [
      { label: "Create a structured mentorship framework — limited hours, clear goals, measurable progress", value: "a", weights: { leadership: 2, focus: 3, technical: 1 } },
      { label: "Say yes immediately — investing in people always compounds, even when it's inconvenient", value: "b", weights: { civic: 2, growth: 2, identity: 2 } },
      { label: "Redirect them to resources and systems first, then offer targeted coaching on gaps they can't fill alone", value: "c", weights: { technical: 2, economic: 1, focus: 2 } },
      { label: "Accept, but use the mentorship as a way to develop your own leadership and communication skills simultaneously", value: "d", weights: { leadership: 3, growth: 2, identity: 1 } },
    ],
  },
  {
    id: "pie-3",
    section: "behavioral",
    scenario: "You're given access to a powerful AI tool that could automate 60% of your current work. What do you prioritize?",
    options: [
      { label: "Map every workflow and systematically identify which tasks benefit from automation vs. human judgment", value: "a", weights: { technical: 3, focus: 2, economic: 1 } },
      { label: "Immediately automate the most time-consuming tasks and redirect freed hours to higher-value creative work", value: "b", weights: { economic: 3, risk: 2, focus: 1 } },
      { label: "Study the tool's limitations first — understand what it can't do before trusting what it can", value: "c", weights: { ethics: 2, identity: 2, growth: 1 } },
      { label: "Share the tool with your team and design a collective adoption strategy", value: "d", weights: { leadership: 3, civic: 1, technical: 1 } },
    ],
  },
  {
    id: "pie-4",
    section: "behavioral",
    scenario: "Your daily routine has become comfortable but you suspect it's no longer producing growth. What triggers change?",
    options: [
      { label: "Evidence — you track metrics and only change when the data confirms stagnation", value: "a", weights: { technical: 2, focus: 2, growth: 1 } },
      { label: "Discomfort — the feeling of plateauing is enough to drive reinvention", value: "b", weights: { identity: 3, risk: 2, growth: 1 } },
      { label: "External input — feedback from trusted people who see your blind spots", value: "c", weights: { leadership: 1, civic: 2, ethics: 2 } },
      { label: "Scheduled disruption — you build periodic reviews into your system regardless of how you feel", value: "d", weights: { focus: 3, technical: 1, growth: 2 } },
    ],
  },
  {
    id: "pie-5",
    section: "behavioral",
    scenario: "You witness a senior leader in your organization making a decision that benefits the company but harms a vulnerable community.",
    options: [
      { label: "Raise the concern through proper channels — document, escalate, and propose alternatives", value: "a", weights: { ethics: 3, civic: 2, leadership: 1 } },
      { label: "Confront the leader directly — silence is complicity", value: "b", weights: { ethics: 2, identity: 3, risk: 2 } },
      { label: "Build a coalition of like-minded colleagues before taking action — collective voice carries more weight", value: "c", weights: { civic: 3, leadership: 2, growth: 1 } },
      { label: "Analyze the full impact — sometimes what looks harmful has unseen benefits, and vice versa", value: "d", weights: { technical: 2, ethics: 1, focus: 2 } },
    ],
  },
  {
    id: "pie-6",
    section: "behavioral",
    scenario: "You receive unexpected income equivalent to three months of your expenses. No debts. What is your instinct?",
    options: [
      { label: "Invest in skill development — courses, certifications, or tools that compound over time", value: "a", weights: { growth: 3, economic: 1, identity: 1 } },
      { label: "Deploy into a revenue-generating asset — the money should work, not rest", value: "b", weights: { economic: 3, risk: 2, technical: 1 } },
      { label: "Split between security (emergency reserves) and opportunity (a calculated bet)", value: "c", weights: { economic: 2, focus: 2, risk: 1 } },
      { label: "Fund a community project or cause you've been wanting to support", value: "d", weights: { civic: 3, ethics: 2, identity: 1 } },
    ],
  },
  {
    id: "pie-7",
    section: "behavioral",
    scenario: "A complex problem requires either deep individual focus or collaborative brainstorming. You can only choose one approach.",
    options: [
      { label: "Deep individual focus — you need uninterrupted thinking to reach real insight", value: "a", weights: { focus: 3, technical: 2, identity: 1 } },
      { label: "Collaborative brainstorming — diverse perspectives surface solutions faster", value: "b", weights: { leadership: 2, civic: 2, growth: 1 } },
      { label: "Individual work first, then present findings for collaborative refinement", value: "c", weights: { focus: 2, leadership: 2, technical: 1 } },
      { label: "It depends entirely on the problem type — you refuse to default to one mode", value: "d", weights: { growth: 2, ethics: 1, identity: 2 } },
    ],
  },
  {
    id: "pie-8",
    section: "behavioral",
    scenario: "You're offered two learning opportunities: a prestigious certification with structured content, or an uncharted project where you'll learn by doing.",
    options: [
      { label: "The certification — structured learning with recognized credentials opens doors", value: "a", weights: { growth: 2, economic: 2, focus: 1 } },
      { label: "The uncharted project — real learning happens in chaos, not classrooms", value: "b", weights: { risk: 3, technical: 2, identity: 1 } },
      { label: "Do both — manage the certification systematically while the project teaches different lessons", value: "c", weights: { focus: 3, growth: 2, economic: 1 } },
      { label: "Evaluate which one aligns more with where you need to be in 3 years", value: "d", weights: { identity: 2, growth: 2, economic: 1 } },
    ],
  },
  {
    id: "pie-9",
    section: "behavioral",
    scenario: "A friend's startup is struggling. They ask you to join part-time for equity, no salary. You believe in the idea.",
    options: [
      { label: "Negotiate clear terms — if you're investing time, you need protected equity and defined milestones", value: "a", weights: { economic: 3, ethics: 1, risk: 1 } },
      { label: "Join — building something meaningful matters more than short-term income", value: "b", weights: { identity: 2, risk: 3, growth: 1 } },
      { label: "Offer strategic advisory instead — contribute your best thinking without risking your stability", value: "c", weights: { leadership: 2, economic: 2, focus: 1 } },
      { label: "Analyze the business fundamentals objectively before letting emotion drive the decision", value: "d", weights: { technical: 2, economic: 1, ethics: 2 } },
    ],
  },
  {
    id: "pie-10",
    section: "behavioral",
    scenario: "Your community faces a recurring problem that local government hasn't addressed. You have relevant skills.",
    options: [
      { label: "Organize a community working group — collective action solves what individuals cannot", value: "a", weights: { civic: 3, leadership: 2, identity: 1 } },
      { label: "Build a digital tool or system that addresses the problem directly", value: "b", weights: { technical: 3, civic: 1, economic: 1 } },
      { label: "Engage local government with a well-researched proposal and offer to lead implementation", value: "c", weights: { leadership: 3, civic: 2, ethics: 1 } },
      { label: "Start with understanding — research the root causes before committing resources", value: "d", weights: { focus: 2, growth: 2, ethics: 1 } },
    ],
  },

  // ── Section 2: Strategic Preferences ──
  {
    id: "pie-11",
    section: "strategic",
    scenario: "You have one year to position yourself for a career leap. You can only focus deeply on one area.",
    options: [
      { label: "Technical mastery — become undeniably good at a specific high-value skill", value: "a", weights: { technical: 3, focus: 2, growth: 1 } },
      { label: "Network and visibility — build relationships with decision-makers who can open doors", value: "b", weights: { leadership: 3, economic: 1, civic: 1 } },
      { label: "Financial infrastructure — build passive income streams that fund your freedom to choose", value: "c", weights: { economic: 3, risk: 1, focus: 1 } },
      { label: "Personal brand and thought leadership — become the recognized authority in your space", value: "d", weights: { identity: 3, leadership: 1, growth: 1 } },
    ],
  },
  {
    id: "pie-12",
    section: "strategic",
    scenario: "You're designing your ideal income architecture for the next 5 years. What's the foundation?",
    options: [
      { label: "High-skill employment — mastery-based salary with regular advancement", value: "a", weights: { growth: 2, focus: 2, technical: 1 } },
      { label: "Business ownership — build systems that generate revenue independently", value: "b", weights: { economic: 3, risk: 2, leadership: 1 } },
      { label: "Portfolio income — investments, royalties, and assets working in parallel", value: "c", weights: { economic: 2, technical: 1, risk: 2 } },
      { label: "Impact-driven career — align income with purpose, even if it means slower financial growth", value: "d", weights: { civic: 2, identity: 3, ethics: 1 } },
    ],
  },
  {
    id: "pie-13",
    section: "strategic",
    scenario: "A major industry shift makes 30% of your current skills obsolete within 2 years. How do you respond?",
    options: [
      { label: "Map the new landscape and immediately start building the skills that will matter most", value: "a", weights: { technical: 3, growth: 2, risk: 1 } },
      { label: "Double down on fundamentals — deep principles transfer across paradigm shifts", value: "b", weights: { focus: 3, identity: 2, growth: 1 } },
      { label: "Position yourself at the intersection of old and new — your experience in both is unique value", value: "c", weights: { economic: 2, leadership: 2, identity: 1 } },
      { label: "Treat it as a strategic opportunity — be early to the new paradigm while others are still catching up", value: "d", weights: { risk: 3, economic: 2, technical: 1 } },
    ],
  },
  {
    id: "pie-14",
    section: "strategic",
    scenario: "You're building a team for a high-stakes project. You can only optimize for one quality.",
    options: [
      { label: "Technical excellence — the best skills produce the best outcomes", value: "a", weights: { technical: 3, focus: 1, growth: 1 } },
      { label: "Character and integrity — talent without trust is a liability", value: "b", weights: { ethics: 3, identity: 2, leadership: 1 } },
      { label: "Complementary diversity — the team must cover each other's blind spots", value: "c", weights: { leadership: 3, civic: 1, growth: 1 } },
      { label: "Execution speed — in high-stakes environments, momentum matters most", value: "d", weights: { risk: 2, economic: 2, focus: 1 } },
    ],
  },
  {
    id: "pie-15",
    section: "strategic",
    scenario: "You have to choose between deepening one skill to world-class level or becoming competent across three complementary skills.",
    options: [
      { label: "Deep mastery — the world rewards specialization at the highest levels", value: "a", weights: { focus: 3, technical: 2, growth: 1 } },
      { label: "Broad competence — the most valuable people connect domains others can't", value: "b", weights: { leadership: 2, economic: 2, growth: 1 } },
      { label: "Start deep, then expand — mastery in one area gives you leverage to learn others faster", value: "c", weights: { growth: 3, focus: 1, technical: 1 } },
      { label: "Depends entirely on the market — choose based on what's scarce, not what's fun", value: "d", weights: { economic: 3, risk: 1, technical: 1 } },
    ],
  },
  {
    id: "pie-16",
    section: "strategic",
    scenario: "You're advising a young Kenyan graduate entering the workforce. What's your primary counsel?",
    options: [
      { label: "Build a technical skill that solves expensive problems — employability is leverage", value: "a", weights: { technical: 2, economic: 2, growth: 1 } },
      { label: "Invest in self-knowledge first — clarity of purpose prevents decades of drift", value: "b", weights: { identity: 3, ethics: 1, growth: 1 } },
      { label: "Start building something of your own early — employment alone won't create wealth", value: "c", weights: { economic: 3, risk: 2, identity: 1 } },
      { label: "Engage with your community — the relationships you build now determine your opportunities later", value: "d", weights: { civic: 3, leadership: 2, ethics: 1 } },
    ],
  },
  {
    id: "pie-17",
    section: "strategic",
    scenario: "You have the opportunity to lead a public initiative that could have significant community impact, but it will consume all your personal project time for 6 months.",
    options: [
      { label: "Take it — community impact at this scale is rare, and your personal projects can wait", value: "a", weights: { civic: 3, leadership: 2, ethics: 1 } },
      { label: "Decline — your personal projects are how you build the foundation to serve at larger scale later", value: "b", weights: { focus: 3, economic: 1, growth: 1 } },
      { label: "Negotiate — find a way to contribute meaningfully without full-time commitment", value: "c", weights: { leadership: 2, economic: 1, focus: 2 } },
      { label: "Accept and restructure — use this as an opportunity to develop leadership skills while delegating personal project tasks", value: "d", weights: { growth: 2, leadership: 2, identity: 1 } },
    ],
  },
  {
    id: "pie-18",
    section: "strategic",
    scenario: "Data shows that your current career path has a ceiling you'll hit within 4 years. You still enjoy the work.",
    options: [
      { label: "Start building the bridge now — enjoyment doesn't justify strategic stagnation", value: "a", weights: { economic: 3, growth: 2, risk: 1 } },
      { label: "Master your current domain so thoroughly that you redefine the ceiling", value: "b", weights: { focus: 3, identity: 2, technical: 1 } },
      { label: "Build lateral capability — adjacent skills create new paths that don't exist yet", value: "c", weights: { technical: 2, growth: 2, leadership: 1 } },
      { label: "Redefine what 'ceiling' means — fulfillment isn't always about vertical advancement", value: "d", weights: { identity: 3, ethics: 1, civic: 1 } },
    ],
  },
  {
    id: "pie-19",
    section: "strategic",
    scenario: "Two organizations want to partner with you. One is prestigious but rigid. The other is unknown but gives you full creative control.",
    options: [
      { label: "The prestigious one — credibility opens doors that creativity alone cannot", value: "a", weights: { economic: 2, leadership: 2, growth: 1 } },
      { label: "The unknown one — creative control is where innovation happens", value: "b", weights: { risk: 3, identity: 2, technical: 1 } },
      { label: "Negotiate creative freedom within the prestigious organization — prestige with autonomy is ideal", value: "c", weights: { leadership: 3, economic: 1, focus: 1 } },
      { label: "Evaluate based on which partnership compounds your skills and network more over 3 years", value: "d", weights: { growth: 3, economic: 1, identity: 1 } },
    ],
  },
  {
    id: "pie-20",
    section: "strategic",
    scenario: "You're allocating your non-work hours for the next 6 months. What dominates?",
    options: [
      { label: "Skill-building — deliberate practice in the area that will have the highest ROI", value: "a", weights: { growth: 3, technical: 2, focus: 1 } },
      { label: "Relationship building — meaningful connections compound exponentially", value: "b", weights: { leadership: 2, civic: 2, identity: 1 } },
      { label: "Health and recovery — peak performance requires a strong foundation", value: "c", weights: { focus: 2, identity: 2, ethics: 1 } },
      { label: "Building a side income — financial freedom accelerates everything else", value: "d", weights: { economic: 3, risk: 1, technical: 1 } },
    ],
  },

  // ── Section 3: Decision-Making Architecture ──
  {
    id: "pie-21",
    section: "decision",
    scenario: "You must choose between a guaranteed outcome worth 70% of optimal, or a risky path with 50% chance of full optimal and 50% chance of near-zero.",
    options: [
      { label: "Take the guarantee — reliable outcomes compound better than volatile ones", value: "a", weights: { focus: 2, economic: 2, growth: 1 } },
      { label: "Take the risk — asymmetric opportunity is how outsized returns happen", value: "b", weights: { risk: 3, economic: 1, identity: 1 } },
      { label: "Look for a way to structure the risk — partial exposure with downside protection", value: "c", weights: { technical: 2, economic: 2, risk: 1 } },
      { label: "Evaluate the domain — in some contexts, guarantee wins; in others, the risk is the only rational choice", value: "d", weights: { growth: 2, ethics: 1, focus: 2 } },
    ],
  },
  {
    id: "pie-22",
    section: "decision",
    scenario: "You discover that following the ethical path will cost you a significant financial opportunity. No one would know if you chose otherwise.",
    options: [
      { label: "Follow ethics without hesitation — integrity is not negotiable at any price", value: "a", weights: { ethics: 3, identity: 3, growth: 0 } },
      { label: "Analyze the situation — not all ethical dilemmas are black and white", value: "b", weights: { ethics: 1, technical: 2, focus: 2 } },
      { label: "Choose ethics but find a way to create an alternative financial path that doesn't require compromise", value: "c", weights: { ethics: 2, economic: 2, identity: 1 } },
      { label: "Follow ethics and use the experience to strengthen your resolve for harder decisions ahead", value: "d", weights: { ethics: 2, growth: 3, identity: 1 } },
    ],
  },
  {
    id: "pie-23",
    section: "decision",
    scenario: "Three experts give you contradictory advice on a critical decision. Each has compelling reasoning.",
    options: [
      { label: "Seek more data — contradictory expert opinions usually mean incomplete information", value: "a", weights: { technical: 3, focus: 2, growth: 1 } },
      { label: "Trust your own judgment — you know your context better than any external advisor", value: "b", weights: { identity: 3, risk: 2, focus: 1 } },
      { label: "Synthesize all three positions — the truth usually lives in the intersection of perspectives", value: "c", weights: { leadership: 2, growth: 2, civic: 1 } },
      { label: "Run a small experiment to test each hypothesis before committing fully", value: "d", weights: { technical: 2, risk: 2, economic: 1 } },
    ],
  },
  {
    id: "pie-24",
    section: "decision",
    scenario: "A new technology could 10x your productivity but requires 3 months of intensive learning. Your competitors aren't adopting it yet.",
    options: [
      { label: "Invest immediately — first-mover advantage in technology adoption is massive", value: "a", weights: { technical: 3, risk: 2, economic: 1 } },
      { label: "Wait and observe — let others discover the pitfalls first", value: "b", weights: { focus: 2, economic: 1, risk: 0 } },
      { label: "Allocate partial time — learn progressively while maintaining current output", value: "c", weights: { focus: 2, growth: 2, economic: 1 } },
      { label: "Assess whether the technology aligns with your long-term strategic direction, not just short-term productivity", value: "d", weights: { identity: 2, growth: 2, ethics: 1 } },
    ],
  },
  {
    id: "pie-25",
    section: "decision",
    scenario: "You've been working on a project for months. New information suggests a completely different approach would be superior. Switching means starting over.",
    options: [
      { label: "Switch — clinging to sunk costs is irrational. The best approach should always win.", value: "a", weights: { risk: 3, technical: 1, growth: 1 } },
      { label: "Finish the current approach first — completion builds discipline, and you can iterate next time", value: "b", weights: { focus: 3, identity: 1, growth: 1 } },
      { label: "Hybrid — extract the best elements of both approaches into a new synthesis", value: "c", weights: { technical: 2, leadership: 1, growth: 2 } },
      { label: "Validate the new information rigorously — 'superior' needs to be proven, not assumed", value: "d", weights: { ethics: 2, focus: 2, technical: 1 } },
    ],
  },
  {
    id: "pie-26",
    section: "decision",
    scenario: "You're negotiating a deal where you have leverage. The other party doesn't fully realize your advantage. How do you proceed?",
    options: [
      { label: "Use your leverage fully — this is how negotiation works", value: "a", weights: { economic: 3, risk: 2, focus: 1 } },
      { label: "Disclose your position honestly — trust-based relationships generate more value long-term", value: "b", weights: { ethics: 3, civic: 1, identity: 1 } },
      { label: "Use leverage strategically but fairly — maximize your position without exploiting theirs", value: "c", weights: { leadership: 2, economic: 2, ethics: 1 } },
      { label: "Create a deal structure where both parties win — the best negotiations expand the pie", value: "d", weights: { civic: 2, leadership: 2, growth: 1 } },
    ],
  },
  {
    id: "pie-27",
    section: "decision",
    scenario: "You're exhausted and behind schedule, but a colleague needs urgent help with something critical to the team.",
    options: [
      { label: "Help immediately — the team's success is your success", value: "a", weights: { leadership: 2, civic: 2, ethics: 1 } },
      { label: "Set a boundary — you can't pour from an empty cup, and your own work matters too", value: "b", weights: { focus: 3, identity: 2, growth: 1 } },
      { label: "Help, but restructure your own schedule to compensate — both matter", value: "c", weights: { leadership: 2, focus: 2, economic: 1 } },
      { label: "Find someone else who can help — solving the problem doesn't require sacrificing your own output", value: "d", weights: { leadership: 2, technical: 1, economic: 2 } },
    ],
  },
  {
    id: "pie-28",
    section: "decision",
    scenario: "A government policy change creates a new market opportunity. It's legal but ethically ambiguous. Many are rushing in.",
    options: [
      { label: "Seize it — if it's legal and you can add value, the market will reward speed", value: "a", weights: { economic: 3, risk: 3, technical: 0 } },
      { label: "Avoid it entirely — ethical ambiguity is a red flag, regardless of legality", value: "b", weights: { ethics: 3, identity: 2, civic: 1 } },
      { label: "Find the ethical lane within the opportunity — there's usually a way to participate with integrity", value: "c", weights: { ethics: 2, economic: 2, growth: 1 } },
      { label: "Study it deeply before acting — understand the second-order effects before committing", value: "d", weights: { technical: 2, civic: 2, focus: 1 } },
    ],
  },
  {
    id: "pie-29",
    section: "decision",
    scenario: "Your analysis tells you one thing, but your gut feeling strongly disagrees. Time is running out.",
    options: [
      { label: "Trust the analysis — instinct is just pattern recognition, and it can be wrong in unfamiliar territory", value: "a", weights: { technical: 3, focus: 2, growth: 1 } },
      { label: "Trust your gut — years of experience encode wisdom that data can't capture", value: "b", weights: { identity: 3, risk: 2, leadership: 1 } },
      { label: "Investigate the disconnect — your gut may be detecting something the analysis is missing", value: "c", weights: { growth: 2, technical: 1, ethics: 2 } },
      { label: "Take the safer option regardless — when analysis and instinct conflict, minimize downside", value: "d", weights: { focus: 2, economic: 1, risk: 0 } },
    ],
  },
  {
    id: "pie-30",
    section: "decision",
    scenario: "You have the chance to publicly credit someone for an idea that was actually yours. It would strengthen the team but cost you personal recognition.",
    options: [
      { label: "Give the credit — great leaders make others shine", value: "a", weights: { leadership: 3, ethics: 2, civic: 1 } },
      { label: "Claim your credit honestly — intellectual honesty matters, and you earned it", value: "b", weights: { identity: 3, ethics: 1, economic: 1 } },
      { label: "Share credit — acknowledge the collaborative nature of how the idea developed", value: "c", weights: { civic: 2, leadership: 2, growth: 1 } },
      { label: "Consider the strategic impact — sometimes recognition now creates opportunities later", value: "d", weights: { economic: 2, focus: 1, growth: 2 } },
    ],
  },

  // ── Section 4: Long-Term Ambition ──
  {
    id: "pie-31",
    section: "ambition",
    scenario: "If you could be known for one thing in 20 years, what would it be?",
    options: [
      { label: "Building systems or technology that solved a significant problem", value: "a", weights: { technical: 3, economic: 1, growth: 1 } },
      { label: "Developing people and institutions that outlasted your direct involvement", value: "b", weights: { leadership: 3, civic: 2, ethics: 1 } },
      { label: "Mastering a discipline to such depth that you pushed the frontier of knowledge", value: "c", weights: { focus: 3, growth: 2, identity: 1 } },
      { label: "Creating economic opportunity for others while building generational wealth", value: "d", weights: { economic: 3, civic: 1, identity: 1 } },
    ],
  },
  {
    id: "pie-32",
    section: "ambition",
    scenario: "Your ideal work environment in 10 years looks like:",
    options: [
      { label: "A high-performance team tackling complex technical challenges", value: "a", weights: { technical: 3, leadership: 1, focus: 1 } },
      { label: "Your own organization with systems running without your daily involvement", value: "b", weights: { economic: 3, leadership: 2, risk: 1 } },
      { label: "A research or creative lab where you have deep focus and intellectual freedom", value: "c", weights: { focus: 3, identity: 2, growth: 1 } },
      { label: "A public-service or governance role where you shape policy and institutions", value: "d", weights: { civic: 3, leadership: 2, ethics: 1 } },
    ],
  },
  {
    id: "pie-33",
    section: "ambition",
    scenario: "What scares you most about the next decade?",
    options: [
      { label: "Becoming irrelevant as technology outpaces your ability to adapt", value: "a", weights: { technical: 2, growth: 3, risk: 1 } },
      { label: "Financial instability — not having built the systems to sustain your goals", value: "b", weights: { economic: 3, focus: 1, risk: 1 } },
      { label: "Losing your sense of purpose or drifting without clear direction", value: "c", weights: { identity: 3, ethics: 1, growth: 1 } },
      { label: "Watching your community struggle while you had the skills to help but didn't act", value: "d", weights: { civic: 3, ethics: 2, leadership: 1 } },
    ],
  },
  {
    id: "pie-34",
    section: "ambition",
    scenario: "A billion-dollar investor offers to fund your vision fully, but you must commit to one domain for 10 years. What do you build?",
    options: [
      { label: "A technology company solving infrastructure problems in Africa", value: "a", weights: { technical: 3, economic: 2, civic: 1 } },
      { label: "An education institution that produces world-class talent from underserved communities", value: "b", weights: { civic: 3, leadership: 2, growth: 1 } },
      { label: "A financial platform that democratizes wealth-building for ordinary people", value: "c", weights: { economic: 3, ethics: 1, technical: 1 } },
      { label: "A leadership development organization that shapes the next generation of ethical leaders", value: "d", weights: { leadership: 3, identity: 2, ethics: 1 } },
    ],
  },
  {
    id: "pie-35",
    section: "ambition",
    scenario: "How do you define personal success at its deepest level?",
    options: [
      { label: "Mastery — becoming genuinely excellent at something that matters", value: "a", weights: { focus: 3, growth: 2, identity: 1 } },
      { label: "Impact — measurably improving the lives of others through your work", value: "b", weights: { civic: 2, leadership: 2, ethics: 1 } },
      { label: "Freedom — the ability to choose how you spend your time and energy", value: "c", weights: { economic: 2, identity: 2, risk: 1 } },
      { label: "Legacy — building something that continues to create value after you're gone", value: "d", weights: { growth: 2, leadership: 2, civic: 1 } },
    ],
  },
  {
    id: "pie-36",
    section: "ambition",
    scenario: "Kenya faces a critical governance challenge. You have both technical and leadership skills. What role do you see yourself playing?",
    options: [
      { label: "Build digital infrastructure that makes governance more transparent and efficient", value: "a", weights: { technical: 3, civic: 2, ethics: 1 } },
      { label: "Enter public service directly — the most capable people should lead", value: "b", weights: { leadership: 3, civic: 2, risk: 1 } },
      { label: "Create economic alternatives — reduce dependency on government by empowering entrepreneurship", value: "c", weights: { economic: 3, civic: 1, identity: 1 } },
      { label: "Educate the next generation — systemic change starts with how we develop young leaders", value: "d", weights: { civic: 2, growth: 3, ethics: 1 } },
    ],
  },
  {
    id: "pie-37",
    section: "ambition",
    scenario: "You can only pass on one principle to the next generation. What is it?",
    options: [
      { label: "Think in systems — understand how things connect before trying to change them", value: "a", weights: { technical: 2, focus: 2, growth: 1 } },
      { label: "Character above competence — who you are matters more than what you know", value: "b", weights: { ethics: 3, identity: 2, civic: 1 } },
      { label: "Build before you consume — create value, don't just extract it", value: "c", weights: { economic: 2, growth: 2, identity: 1 } },
      { label: "Serve beyond yourself — the highest human achievement is making others' lives better", value: "d", weights: { civic: 3, leadership: 1, ethics: 1 } },
    ],
  },
  {
    id: "pie-38",
    section: "ambition",
    scenario: "If financial concerns were eliminated, what would your daily work focus on?",
    options: [
      { label: "Research and building — deep technical work on meaningful problems", value: "a", weights: { technical: 3, focus: 2, growth: 1 } },
      { label: "Teaching and mentoring — developing others' capabilities", value: "b", weights: { leadership: 2, civic: 2, growth: 1 } },
      { label: "Governance and policy — shaping the systems that affect millions", value: "c", weights: { civic: 3, ethics: 2, leadership: 1 } },
      { label: "Creating — writing, designing, and building things that express your vision", value: "d", weights: { identity: 3, growth: 1, economic: 1 } },
    ],
  },
  {
    id: "pie-39",
    section: "ambition",
    scenario: "Your greatest contribution to Kenya's future would come through:",
    options: [
      { label: "Technology innovation — building solutions that leapfrog infrastructure challenges", value: "a", weights: { technical: 3, economic: 1, risk: 1 } },
      { label: "Youth development — systematically equipping the next generation with skills and values", value: "b", weights: { civic: 2, leadership: 2, growth: 2 } },
      { label: "Economic systems — creating wealth-building platforms accessible to ordinary citizens", value: "c", weights: { economic: 3, ethics: 1, civic: 1 } },
      { label: "Institutional reform — strengthening governance and accountability structures", value: "d", weights: { civic: 3, ethics: 2, leadership: 1 } },
    ],
  },
  {
    id: "pie-40",
    section: "ambition",
    scenario: "At the end of your career, what would make you feel it was truly well-spent?",
    options: [
      { label: "You built something lasting — a system, company, or institution that continues without you", value: "a", weights: { economic: 2, technical: 2, growth: 1 } },
      { label: "You developed people — dozens of capable leaders emerged because of your investment", value: "b", weights: { leadership: 3, civic: 2, identity: 1 } },
      { label: "You stayed true to your values — success was never purchased at the cost of integrity", value: "c", weights: { ethics: 3, identity: 2, growth: 1 } },
      { label: "You mastered your craft — your work set standards others aspire to reach", value: "d", weights: { focus: 3, technical: 1, growth: 2 } },
    ],
  },
];

// ─── Archetype Definitions ────────────────────────────────────

export const genlinkArchetypes: GenlinkArchetype[] = [
  {
    id: "entrepreneurial-strategist",
    title: "The Entrepreneurial Strategist",
    tagline: "You build systems that generate value — for yourself and others",
    description: "Your mind naturally gravitates toward opportunity, systems, and economic architecture. You think in business models, revenue systems, and scalable impact. Your growth comes from building, not just learning.",
    strengths: ["Business model design", "Revenue engineering", "Market positioning", "Strategic risk-taking", "Resource optimization"],
    pillarMapping: {
      pillar1Path: "high-performance-architect",
      pillar2Path: "income-systems-enterprise",
      pillar3Path: "digital-tools-entrepreneurs",
      specialization: "creator-economy → digital-business-builder",
      pillar7Integration: "policy-technologist",
    },
    projectedTrajectory: "Year 1: Master personal systems and financial architecture. Year 2: Build and launch digital enterprise. Year 3: Scale operations, mentor others, and expand into adjacent markets.",
    deepWorkStructure: "4-hour morning deep work blocks on core business building. Afternoons for strategic networking and market analysis. Weekly review and system optimization.",
    economicPositioning: "Portfolio entrepreneur with 2-3 revenue streams by Year 2. Target: financial independence by Year 3 through systems that operate independently.",
  },
  {
    id: "technical-systems-builder",
    title: "The Technical Systems Builder",
    tagline: "You solve problems with code, data, and intelligent systems",
    description: "Your aptitude lies in technical depth — programming, data analysis, and building intelligent solutions. You approach the world as a set of systems to be understood, optimized, and automated.",
    strengths: ["System architecture", "Problem decomposition", "Data-driven thinking", "Technical depth", "Automation design"],
    pillarMapping: {
      pillar1Path: "high-performance-architect",
      pillar2Path: "investor-market-intelligence",
      pillar3Path: "digital-productivity-specialist",
      specialization: "programming-systems → software-developer or data-scientist",
      pillar7Integration: "policy-technologist",
    },
    projectedTrajectory: "Year 1: Master programming fundamentals and digital systems. Year 2: Build specialization in data science or AI. Year 3: Deploy intelligent systems solving real-world problems.",
    deepWorkStructure: "5-hour morning deep work blocks on technical skill building. Structured deliberate practice sessions. Weekly project milestones with progressive complexity.",
    economicPositioning: "High-value technical professional by Year 1. Specialist/consultant by Year 2. Technical co-founder or senior engineer by Year 3.",
  },
  {
    id: "civic-technocrat",
    title: "The Civic Technocrat",
    tagline: "You build bridges between technology, governance, and community impact",
    description: "Your orientation bridges civic responsibility with technical capability. You see governance challenges as problems to be solved with modern tools, data, and ethical leadership.",
    strengths: ["Policy analysis", "Stakeholder engagement", "Community organizing", "Digital governance tools", "Ethical decision-making"],
    pillarMapping: {
      pillar1Path: "leadership-psychology",
      pillar2Path: "personal-finance-stability",
      pillar3Path: "digital-research-intelligence",
      specialization: "cybersecurity → digital-safety-advocate",
      pillar7Integration: "community-leader or governance-analyst",
    },
    projectedTrajectory: "Year 1: Build leadership foundation and digital research skills. Year 2: Engage in community governance initiatives. Year 3: Lead institutional reform or policy advocacy projects.",
    deepWorkStructure: "Morning research and analysis blocks. Afternoon stakeholder engagement and community work. Regular reflection on impact metrics and ethical alignment.",
    economicPositioning: "Policy analyst or community development lead by Year 1. NGO or government role by Year 2. Institutional leadership by Year 3.",
  },
  {
    id: "financial-architect",
    title: "The Financial Architect",
    tagline: "You design wealth systems with discipline, analysis, and long-term vision",
    description: "Your mind is wired for financial systems — risk management, portfolio construction, and wealth architecture. You approach money not as a goal but as infrastructure to be designed.",
    strengths: ["Financial modeling", "Risk analysis", "Portfolio construction", "Economic reasoning", "Wealth system design"],
    pillarMapping: {
      pillar1Path: "identity-discipline-builder",
      pillar2Path: "investor-market-intelligence",
      pillar3Path: "digital-research-intelligence",
      specialization: "financial-intelligence → capital-preservation-risk (unit track)",
      pillar7Integration: "governance-analyst",
    },
    projectedTrajectory: "Year 1: Master personal finance discipline and investment fundamentals. Year 2: Build analytical frameworks for market intelligence. Year 3: Design and manage portfolio strategies or financial advisory practice.",
    deepWorkStructure: "Morning market analysis and research. Structured study of financial instruments and risk modeling. Weekly portfolio review and strategy refinement.",
    economicPositioning: "Financially disciplined with growing portfolio by Year 1. Investment-competent with advisory capability by Year 2. Financial independence trajectory by Year 3.",
  },
  {
    id: "identity-catalyst",
    title: "The Identity Catalyst",
    tagline: "You transform yourself — and then transform others",
    description: "Your primary orientation is internal mastery and influence. You believe that external impact begins with deep self-knowledge, disciplined character, and the ability to inspire transformation in others.",
    strengths: ["Self-awareness", "Behavioral design", "Motivational leadership", "Ethical reasoning", "Transformative coaching"],
    pillarMapping: {
      pillar1Path: "identity-discipline-builder",
      pillar2Path: "personal-finance-stability",
      pillar3Path: "remote-work-operations",
      specialization: "creator-economy → content-creator",
      pillar7Integration: "community-leader",
    },
    projectedTrajectory: "Year 1: Complete deep identity work and build personal discipline systems. Year 2: Begin coaching, content creation, or community leadership. Year 3: Establish transformative practice — coaching, writing, or institutional development.",
    deepWorkStructure: "Morning reflection and deliberate practice. Structured journaling and self-assessment protocols. Afternoon coaching, writing, or community engagement.",
    economicPositioning: "Personal development professional by Year 1. Coaching or training practice by Year 2. Thought leader or institutional builder by Year 3.",
  },
  {
    id: "security-sentinel",
    title: "The Security Sentinel",
    tagline: "You protect what others build — with technical depth and ethical vigilance",
    description: "Your orientation combines technical capability with a protective instinct. You're drawn to cybersecurity, risk management, and ensuring that digital systems serve people safely.",
    strengths: ["Threat analysis", "Security architecture", "Risk assessment", "Digital forensics", "Ethical hacking"],
    pillarMapping: {
      pillar1Path: "high-performance-architect",
      pillar2Path: "personal-finance-stability",
      pillar3Path: "digital-productivity-specialist",
      specialization: "cybersecurity → ethical-hacker or cybersecurity-analyst",
      pillar7Integration: "governance-analyst",
    },
    projectedTrajectory: "Year 1: Master security fundamentals and digital literacy. Year 2: Specialize in penetration testing or security operations. Year 3: Lead security teams or establish security consulting practice.",
    deepWorkStructure: "Morning technical labs and CTF practice. Afternoon threat intelligence research and tool development. Weekly security assessment simulations.",
    economicPositioning: "Junior security analyst by Year 1. Specialist or pen tester by Year 2. Security consultant or team lead by Year 3.",
  },
];

// ─── Scoring Engine ───────────────────────────────────────────

export interface PIEResult {
  archetype: GenlinkArchetype;
  dimensionScores: Record<string, number>;
  dimensionPercentages: Record<string, number>;
  sectionProgress: Record<string, boolean>;
}

export const computePIEResult = (
  answers: Record<string, Record<string, number>>
): PIEResult => {
  const dimensionScores: Record<string, number> = {};
  pieDimensions.forEach((d) => (dimensionScores[d.id] = 0));

  Object.values(answers).forEach((weights) => {
    Object.entries(weights).forEach(([dimId, weight]) => {
      dimensionScores[dimId] = (dimensionScores[dimId] || 0) + weight;
    });
  });

  // Normalize to percentages
  const maxPossible = pieQuestions.length * 3; // max weight per question
  const dimensionPercentages: Record<string, number> = {};
  pieDimensions.forEach((d) => {
    dimensionPercentages[d.id] = Math.round(
      ((dimensionScores[d.id] || 0) / maxPossible) * 100
    );
  });

  // Match archetype using weighted dimension pattern
  const archetypeDimensionMap: Record<string, string[]> = {
    "entrepreneurial-strategist": ["economic", "risk", "leadership"],
    "technical-systems-builder": ["technical", "focus", "growth"],
    "civic-technocrat": ["civic", "ethics", "leadership"],
    "financial-architect": ["economic", "focus", "technical"],
    "identity-catalyst": ["identity", "ethics", "growth"],
    "security-sentinel": ["technical", "ethics", "focus"],
  };

  let bestArchetype = genlinkArchetypes[0];
  let bestScore = -Infinity;

  genlinkArchetypes.forEach((archetype) => {
    const primaryDims = archetypeDimensionMap[archetype.id] || [];
    let score = 0;
    primaryDims.forEach((dim, idx) => {
      const multiplier = idx === 0 ? 3 : idx === 1 ? 2 : 1;
      score += (dimensionScores[dim] || 0) * multiplier;
    });
    // Add secondary influence from all dimensions
    pieDimensions.forEach((d) => {
      if (!primaryDims.includes(d.id)) {
        score += (dimensionScores[d.id] || 0) * 0.2;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestArchetype = archetype;
    }
  });

  const sectionProgress: Record<string, boolean> = {};
  pieSections.forEach((s) => {
    sectionProgress[s.id] = s.questionIds.every((qId) => answers[qId] !== undefined);
  });

  return {
    archetype: bestArchetype,
    dimensionScores,
    dimensionPercentages,
    sectionProgress,
  };
};
