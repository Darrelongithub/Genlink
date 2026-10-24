// ─── Pillar Orientation Assessment Data ────────────────────────
// Weighted multi-dimensional diagnostic for each pillar

export interface OrientationDimension {
  id: string;
  label: string;
}

export interface OrientationOption {
  label: string;
  value: string;
  weights: Record<string, number>; // dimension_id → weight
}

export interface OrientationQuestion {
  id: string;
  scenario: string;
  options: OrientationOption[];
}

export interface LearnerArchetype {
  id: string;
  title: string;
  description: string;
  strengths: string[];
  recommendedPathId: string;
  alternatePathIds: string[];
}

export interface PillarAssessment {
  pillarId: string;
  dimensions: OrientationDimension[];
  questions: OrientationQuestion[];
  archetypes: LearnerArchetype[];
}

// ─── Scoring Logic ─────────────────────────────────────────────
export const computeArchetype = (
  answers: Record<string, Record<string, number>>,
  assessment: PillarAssessment
): LearnerArchetype => {
  const dimensionScores: Record<string, number> = {};
  assessment.dimensions.forEach((d) => (dimensionScores[d.id] = 0));

  Object.values(answers).forEach((weights) => {
    Object.entries(weights).forEach(([dimId, weight]) => {
      dimensionScores[dimId] = (dimensionScores[dimId] || 0) + weight;
    });
  });

  // Find best matching archetype by summing relevant dimension scores
  let bestArchetype = assessment.archetypes[0];
  let bestScore = -Infinity;

  assessment.archetypes.forEach((archetype) => {
    // Each archetype implicitly matches dimensions — score based on pattern
    const archetypeIndex = assessment.archetypes.indexOf(archetype);
    const dims = assessment.dimensions;
    let score = 0;

    // Distribute dimension affinity across archetypes
    if (dims.length >= 2) {
      const dimsPerArchetype = Math.ceil(dims.length / assessment.archetypes.length);
      const startIdx = archetypeIndex * dimsPerArchetype;
      const endIdx = Math.min(startIdx + dimsPerArchetype, dims.length);
      for (let i = startIdx; i < endIdx; i++) {
        score += dimensionScores[dims[i].id] || 0;
      }
      // Also add a portion of remaining dimensions for overlap
      dims.forEach((d, i) => {
        if (i < startIdx || i >= endIdx) {
          score += (dimensionScores[d.id] || 0) * 0.3;
        }
      });
    }

    if (score > bestScore) {
      bestScore = score;
      bestArchetype = archetype;
    }
  });

  return bestArchetype;
};

// ═══════════════════════════════════════════════════════════════
// PILLAR ASSESSMENTS
// ═══════════════════════════════════════════════════════════════

export const pillarAssessments: Record<string, PillarAssessment> = {
  // ─── Pillar 1: Personal Mastery ──────────────────────────────
  "personal-mastery": {
    pillarId: "personal-mastery",
    dimensions: [
      { id: "cognitive", label: "Cognitive Style" },
      { id: "execution", label: "Execution Style" },
      { id: "risk", label: "Risk Orientation" },
      { id: "timeHorizon", label: "Time Horizon" },
      { id: "depth", label: "Depth Preference" },
      { id: "motivation", label: "Motivation Driver" },
    ],
    questions: [
      {
        id: "pm-1",
        scenario: "You inherit a struggling community project with six months of runway. You must choose your first move.",
        options: [
          { label: "Audit every process and identify the three deepest structural failures before acting", value: "a", weights: { cognitive: 3, depth: 2, timeHorizon: 1 } },
          { label: "Rally the team around a shared vision and rebuild morale immediately", value: "b", weights: { execution: 2, motivation: 3, risk: 1 } },
          { label: "Redesign the operating workflow from scratch — automate what can be automated", value: "c", weights: { cognitive: 2, execution: 3, depth: 1 } },
          { label: "Launch a quick win initiative to prove momentum while planning the overhaul", value: "d", weights: { risk: 2, timeHorizon: 2, motivation: 2 } },
        ],
      },
      {
        id: "pm-2",
        scenario: "A close friend asks for advice on a major life change. They're torn between safety and ambition.",
        options: [
          { label: "Help them map their values and let the decision emerge from self-knowledge", value: "a", weights: { depth: 3, cognitive: 2, motivation: 1 } },
          { label: "Share frameworks for weighing trade-offs and risks objectively", value: "b", weights: { cognitive: 3, risk: 2, execution: 1 } },
          { label: "Challenge them to articulate what they'd regret more in five years", value: "c", weights: { timeHorizon: 3, motivation: 2, depth: 1 } },
          { label: "Offer to be their accountability partner as they experiment with the ambitious path", value: "d", weights: { execution: 3, risk: 2, motivation: 1 } },
        ],
      },
      {
        id: "pm-3",
        scenario: "You have 90 uninterrupted days with no obligations. How do you spend them?",
        options: [
          { label: "Design and test a complete personal operating system — habits, routines, reviews", value: "a", weights: { execution: 3, depth: 2, timeHorizon: 1 } },
          { label: "Read deeply across philosophy, psychology, and neuroscience — then write about it", value: "b", weights: { cognitive: 3, depth: 3, motivation: 0 } },
          { label: "Build a leadership initiative — gather people, create something that outlasts the 90 days", value: "c", weights: { motivation: 3, risk: 1, execution: 2 } },
          { label: "Train intensely in one discipline — martial arts, meditation, or public speaking", value: "d", weights: { depth: 2, execution: 2, risk: 2 } },
        ],
      },
      {
        id: "pm-4",
        scenario: "Your team disagrees on a critical direction. The data supports one path, but the team's instinct leans another way.",
        options: [
          { label: "Present the data transparently and let the strongest argument win — even if unpopular", value: "a", weights: { cognitive: 3, risk: 2, depth: 1 } },
          { label: "Facilitate a structured discussion where each perspective gets equal weight", value: "b", weights: { motivation: 2, execution: 2, cognitive: 2 } },
          { label: "Trust the team's collective instinct — they have context the data doesn't capture", value: "c", weights: { risk: 3, motivation: 2, timeHorizon: 1 } },
          { label: "Propose a controlled experiment to test both hypotheses before committing", value: "d", weights: { execution: 3, timeHorizon: 2, cognitive: 1 } },
        ],
      },
      {
        id: "pm-5",
        scenario: "You discover that a habit you've maintained for months is producing diminishing returns. What do you do?",
        options: [
          { label: "Analyze why it's declining — is the habit wrong, or has your execution degraded?", value: "a", weights: { cognitive: 3, depth: 2, execution: 1 } },
          { label: "Replace it immediately with a new system — iterate fast, don't cling to what's broken", value: "b", weights: { execution: 3, risk: 2, timeHorizon: 0 } },
          { label: "Step back and reassess whether this goal still aligns with your values", value: "c", weights: { depth: 3, motivation: 2, timeHorizon: 1 } },
          { label: "Redesign the habit within a broader system — maybe the problem is isolation, not the habit itself", value: "d", weights: { execution: 2, cognitive: 2, depth: 2 } },
        ],
      },
      {
        id: "pm-6",
        scenario: "You're offered two opportunities: a stable position with steady growth, or a high-risk venture that could reshape your career.",
        options: [
          { label: "Take the stable position — build from a foundation of security", value: "a", weights: { timeHorizon: 3, risk: 0, depth: 2 } },
          { label: "Take the venture — discomfort is the price of extraordinary growth", value: "b", weights: { risk: 3, motivation: 2, execution: 1 } },
          { label: "Negotiate a way to do both — design a hybrid that mitigates risk", value: "c", weights: { execution: 3, cognitive: 2, risk: 1 } },
          { label: "Delay the decision — gather more information and consult mentors", value: "d", weights: { cognitive: 2, timeHorizon: 2, depth: 2 } },
        ],
      },
    ],
    archetypes: [
      {
        id: "disciplined-architect",
        title: "The Disciplined Architect",
        description: "You approach growth with methodical precision. Your strength lies in building sustainable systems and deep self-awareness. You prefer structure over spontaneity and value consistency above all.",
        strengths: ["Systematic thinking", "Habit architecture", "Long-term consistency"],
        recommendedPathId: "identity-discipline-builder",
        alternatePathIds: ["high-performance-architect"],
      },
      {
        id: "strategic-influencer",
        title: "The Strategic Influencer",
        description: "You see growth through the lens of human dynamics. Your natural ability to read people, communicate persuasively, and build coalitions makes you a force multiplier in any environment.",
        strengths: ["Persuasive communication", "Coalition building", "Adaptive leadership"],
        recommendedPathId: "leadership-psychology",
        alternatePathIds: ["identity-discipline-builder"],
      },
      {
        id: "systems-optimizer",
        title: "The Systems Optimizer",
        description: "You think in frameworks and feedback loops. Where others see chaos, you see patterns to be organized. Your drive is to design systems that run without constant intervention.",
        strengths: ["Framework design", "Process optimization", "Peak performance engineering"],
        recommendedPathId: "high-performance-architect",
        alternatePathIds: ["leadership-psychology"],
      },
    ],
  },

  // ─── Pillar 2: Financial Intelligence ────────────────────────
  "financial-intelligence": {
    pillarId: "financial-intelligence",
    dimensions: [
      { id: "cognitive", label: "Cognitive Style" },
      { id: "execution", label: "Execution Style" },
      { id: "risk", label: "Risk Orientation" },
      { id: "timeHorizon", label: "Time Horizon" },
      { id: "depth", label: "Depth Preference" },
      { id: "motivation", label: "Motivation Driver" },
    ],
    questions: [
      {
        id: "fi-1",
        scenario: "You receive an unexpected windfall of Ksh 500,000. There are no urgent debts. What is your first instinct?",
        options: [
          { label: "Park it in a high-interest savings account while you research the best long-term placement", value: "a", weights: { cognitive: 2, timeHorizon: 3, risk: 0 } },
          { label: "Allocate portions across multiple assets — diversification protects against ignorance", value: "b", weights: { depth: 2, cognitive: 3, risk: 1 } },
          { label: "Invest it into a business opportunity you've been studying — capital should work, not sit", value: "c", weights: { execution: 3, risk: 3, motivation: 0 } },
          { label: "Use it to build financial infrastructure — emergency fund, insurance gaps, then invest the remainder", value: "d", weights: { timeHorizon: 2, depth: 2, execution: 2 } },
        ],
      },
      {
        id: "fi-2",
        scenario: "A colleague proposes a joint investment that requires quick commitment. The projected returns are high but the research window is narrow.",
        options: [
          { label: "Decline — if you can't understand the risk fully, you can't manage it", value: "a", weights: { depth: 3, cognitive: 2, risk: 0 } },
          { label: "Commit a small amount you can afford to lose — treat it as a learning investment", value: "b", weights: { risk: 2, execution: 2, motivation: 2 } },
          { label: "Ask for 48 hours to run your own analysis — then decide based on your numbers, not theirs", value: "c", weights: { cognitive: 3, depth: 2, timeHorizon: 1 } },
          { label: "Negotiate — propose a structure that reduces your downside while maintaining upside participation", value: "d", weights: { execution: 3, cognitive: 1, risk: 2 } },
        ],
      },
      {
        id: "fi-3",
        scenario: "Your investment portfolio drops 15% in one month due to market volatility. How do you respond?",
        options: [
          { label: "Rebalance according to your original strategy — volatility is noise, not signal", value: "a", weights: { timeHorizon: 3, cognitive: 2, depth: 1 } },
          { label: "Analyze each position to determine if the fundamentals have changed or only sentiment", value: "b", weights: { cognitive: 3, depth: 3, risk: 0 } },
          { label: "See it as a buying opportunity — deploy more capital into undervalued positions", value: "c", weights: { risk: 3, execution: 2, motivation: 1 } },
          { label: "Shift a portion to safer assets — preserving capital matters more than catching the bottom", value: "d", weights: { risk: 0, timeHorizon: 2, depth: 2 } },
        ],
      },
      {
        id: "fi-4",
        scenario: "You're designing your financial future for the next decade. What does success look like?",
        options: [
          { label: "Complete financial security — zero debt, fully funded emergency reserves, and predictable cash flow", value: "a", weights: { timeHorizon: 3, depth: 1, risk: 0 } },
          { label: "A diversified portfolio generating passive income that covers living expenses", value: "b", weights: { cognitive: 2, depth: 3, timeHorizon: 1 } },
          { label: "Multiple income-generating businesses with systems that don't require your daily presence", value: "c", weights: { execution: 3, motivation: 3, risk: 0 } },
          { label: "Deep understanding of markets and the ability to generate alpha consistently", value: "d", weights: { cognitive: 3, depth: 2, risk: 1 } },
        ],
      },
      {
        id: "fi-5",
        scenario: "Two financial opportunities arrive simultaneously. One offers steady 12% annual returns with minimal effort. The other offers 40%+ potential but demands significant time and carries real downside risk.",
        options: [
          { label: "Take the steady option — compounding predictable returns is the most powerful wealth engine", value: "a", weights: { timeHorizon: 3, depth: 2, risk: 0 } },
          { label: "Split between both — use the steady returns to fund the risky exploration", value: "b", weights: { execution: 2, cognitive: 2, risk: 2 } },
          { label: "Take the high-potential option — you can tolerate short-term volatility for outsized returns", value: "c", weights: { risk: 3, motivation: 2, execution: 1 } },
          { label: "Analyze both rigorously — map out the full risk-reward profile before committing to either", value: "d", weights: { cognitive: 3, depth: 3, timeHorizon: 0 } },
        ],
      },
      {
        id: "fi-6",
        scenario: "A trusted mentor tells you that your biggest financial weakness isn't knowledge — it's behavior. What resonates most?",
        options: [
          { label: "I tend to delay action — analysis paralysis keeps me from deploying capital", value: "a", weights: { cognitive: 2, depth: 2, execution: 0 } },
          { label: "I'm too conservative — I protect capital at the cost of growth opportunities", value: "b", weights: { risk: 0, timeHorizon: 3, depth: 1 } },
          { label: "I chase opportunities — I spread too thin instead of going deep on one strategy", value: "c", weights: { risk: 3, execution: 2, motivation: 1 } },
          { label: "I lack systems — my financial decisions are reactive, not strategic", value: "d", weights: { execution: 3, cognitive: 1, timeHorizon: 2 } },
        ],
      },
    ],
    archetypes: [
      {
        id: "stability-architect",
        title: "The Stability Architect",
        description: "You prioritize building an unshakeable financial foundation. Your methodical approach to risk management and preference for predictable systems makes you exceptionally suited for designing personal financial security.",
        strengths: ["Financial discipline", "Risk management", "Long-term planning"],
        recommendedPathId: "personal-finance-stability",
        alternatePathIds: ["investor-market-intelligence"],
      },
      {
        id: "market-strategist",
        title: "The Market Strategist",
        description: "You approach finance with analytical rigor. Markets fascinate you not as gambling arenas but as complex systems to be understood. Your edge is data-driven decision-making and portfolio intelligence.",
        strengths: ["Analytical depth", "Portfolio construction", "Data-driven decisions"],
        recommendedPathId: "investor-market-intelligence",
        alternatePathIds: ["personal-finance-stability", "income-systems-enterprise"],
      },
      {
        id: "enterprise-builder",
        title: "The Enterprise Builder",
        description: "You see money as fuel for creation. Your entrepreneurial instinct drives you to build systems that generate value independently. You think in revenue models, not savings rates.",
        strengths: ["Business model design", "Revenue engineering", "Opportunity identification"],
        recommendedPathId: "income-systems-enterprise",
        alternatePathIds: ["investor-market-intelligence"],
      },
    ],
  },

  // ─── Pillar 3: Digital Literacy ──────────────────────────────
  "digital-literacy": {
    pillarId: "digital-literacy",
    dimensions: [
      { id: "cognitive", label: "Cognitive Style" },
      { id: "execution", label: "Execution Style" },
      { id: "risk", label: "Risk Orientation" },
      { id: "timeHorizon", label: "Time Horizon" },
      { id: "depth", label: "Depth Preference" },
      { id: "motivation", label: "Motivation Driver" },
    ],
    questions: [
      {
        id: "dl-1",
        scenario: "Your organization wants to adopt a new productivity tool stack. You're asked to lead the transition.",
        options: [
          { label: "Research every option exhaustively and build a comparison matrix before recommending", value: "a", weights: { cognitive: 3, depth: 2, timeHorizon: 1 } },
          { label: "Pick the best-fit tool quickly, run a pilot with a small team, iterate based on feedback", value: "b", weights: { execution: 3, risk: 2, motivation: 1 } },
          { label: "Survey the team first — the best tool is the one people will actually use", value: "c", weights: { motivation: 3, execution: 2, depth: 1 } },
          { label: "Design a phased rollout with training, documentation, and fallback plans", value: "d", weights: { timeHorizon: 2, depth: 2, cognitive: 2 } },
        ],
      },
      {
        id: "dl-2",
        scenario: "You discover that an AI tool can automate 60% of your daily work. What's your immediate reaction?",
        options: [
          { label: "Study how it works internally before trusting it with anything important", value: "a", weights: { cognitive: 3, depth: 3, risk: 0 } },
          { label: "Start using it immediately for low-stakes tasks and gradually expand", value: "b", weights: { execution: 3, risk: 2, timeHorizon: 1 } },
          { label: "Think about what you'll do with the freed time — automation should serve larger goals", value: "c", weights: { motivation: 3, timeHorizon: 2, depth: 1 } },
          { label: "Build a workflow that combines AI automation with human review checkpoints", value: "d", weights: { execution: 2, cognitive: 2, depth: 2 } },
        ],
      },
      {
        id: "dl-3",
        scenario: "You need to present complex data to a non-technical audience. How do you prepare?",
        options: [
          { label: "Create detailed visualizations that tell the story without requiring explanation", value: "a", weights: { depth: 3, cognitive: 2, execution: 1 } },
          { label: "Simplify ruthlessly — three key numbers and one clear takeaway", value: "b", weights: { execution: 3, motivation: 2, timeHorizon: 1 } },
          { label: "Build an interactive dashboard they can explore at their own pace", value: "c", weights: { cognitive: 2, depth: 2, execution: 2 } },
          { label: "Start with why it matters to them, then work backward to the data", value: "d", weights: { motivation: 3, cognitive: 1, risk: 2 } },
        ],
      },
      {
        id: "dl-4",
        scenario: "Your remote team struggles with communication gaps and missed deadlines across time zones.",
        options: [
          { label: "Implement async-first communication protocols with clear documentation standards", value: "a", weights: { execution: 3, depth: 2, timeHorizon: 1 } },
          { label: "Schedule structured check-ins and create visibility into everyone's progress", value: "b", weights: { motivation: 2, execution: 2, cognitive: 2 } },
          { label: "Analyze the root cause — is it tooling, process, or culture?", value: "c", weights: { cognitive: 3, depth: 3, risk: 0 } },
          { label: "Empower each team member with autonomy and measure outcomes, not activity", value: "d", weights: { risk: 2, motivation: 3, timeHorizon: 1 } },
        ],
      },
      {
        id: "dl-5",
        scenario: "You're choosing between specializing deeply in one tool ecosystem or maintaining broad fluency across many.",
        options: [
          { label: "Go deep — mastery of one ecosystem makes you irreplaceable", value: "a", weights: { depth: 3, timeHorizon: 2, cognitive: 1 } },
          { label: "Stay broad — adaptability matters more than specialization in a fast-changing landscape", value: "b", weights: { risk: 2, execution: 2, motivation: 2 } },
          { label: "Build a T-shape — deep in one, competent across several", value: "c", weights: { cognitive: 2, depth: 2, execution: 2 } },
          { label: "Focus on principles — tools change, but workflows and mental models transfer everywhere", value: "d", weights: { cognitive: 3, timeHorizon: 2, depth: 1 } },
        ],
      },
      {
        id: "dl-6",
        scenario: "A small business owner asks you to recommend the most impactful digital tool for their growth. Budget is limited.",
        options: [
          { label: "Recommend a CRM — the most valuable asset is customer relationships", value: "a", weights: { execution: 2, motivation: 3, depth: 1 } },
          { label: "Suggest a financial tracking tool — you can't grow what you can't measure", value: "b", weights: { cognitive: 2, depth: 2, timeHorizon: 2 } },
          { label: "Recommend automation — eliminate their biggest time sink first", value: "c", weights: { execution: 3, cognitive: 2, risk: 1 } },
          { label: "Ask more questions — the right tool depends on their biggest constraint", value: "d", weights: { cognitive: 3, depth: 2, motivation: 1 } },
        ],
      },
    ],
    archetypes: [
      {
        id: "productivity-specialist",
        title: "The Productivity Specialist",
        description: "You excel at building efficient workflows and mastering digital tools. Your strength is turning chaos into streamlined systems that amplify team output.",
        strengths: ["Workflow optimization", "Tool mastery", "System design"],
        recommendedPathId: "digital-productivity-specialist",
        alternatePathIds: ["remote-work-operations"],
      },
      {
        id: "remote-operations-lead",
        title: "The Remote Operations Lead",
        description: "You understand distributed teams intuitively. Your ability to design communication protocols, maintain visibility, and build culture across distance makes you invaluable in the modern workplace.",
        strengths: ["Async communication", "Team coordination", "Virtual culture building"],
        recommendedPathId: "remote-work-operations",
        alternatePathIds: ["digital-productivity-specialist", "digital-tools-entrepreneurs"],
      },
      {
        id: "research-analyst",
        title: "The Research & Intelligence Analyst",
        description: "You think critically about information. Your analytical depth, verification instincts, and ability to extract meaning from data make you a trusted authority in evidence-based decision-making.",
        strengths: ["Critical analysis", "Information verification", "Data interpretation"],
        recommendedPathId: "digital-research-intelligence",
        alternatePathIds: ["digital-tools-entrepreneurs"],
      },
      {
        id: "digital-entrepreneur",
        title: "The Digital Entrepreneur",
        description: "You see digital tools as business leverage. Your instinct is to find the tool stack that removes bottlenecks and scales operations — making technology serve commercial outcomes.",
        strengths: ["Business tool strategy", "Marketing automation", "Growth hacking"],
        recommendedPathId: "digital-tools-entrepreneurs",
        alternatePathIds: ["digital-productivity-specialist"],
      },
    ],
  },

  // ─── Pillar 4: Cybersecurity ─────────────────────────────────
  "cybersecurity": {
    pillarId: "cybersecurity",
    dimensions: [
      { id: "cognitive", label: "Cognitive Style" },
      { id: "execution", label: "Execution Style" },
      { id: "risk", label: "Risk Orientation" },
      { id: "timeHorizon", label: "Time Horizon" },
      { id: "depth", label: "Depth Preference" },
      { id: "motivation", label: "Motivation Driver" },
    ],
    questions: [
      {
        id: "cs-1",
        scenario: "Your organization's network shows unusual traffic patterns at 2 AM. No alarms have triggered yet.",
        options: [
          { label: "Investigate immediately — anomalies are intel, not noise", value: "a", weights: { cognitive: 3, depth: 2, execution: 1 } },
          { label: "Check logs against known attack signatures first — respond to data, not anxiety", value: "b", weights: { cognitive: 2, depth: 3, timeHorizon: 1 } },
          { label: "Isolate the affected segment and analyze in a controlled environment", value: "c", weights: { execution: 3, risk: 2, depth: 1 } },
          { label: "Alert the team and initiate the incident response playbook", value: "d", weights: { motivation: 2, execution: 2, timeHorizon: 2 } },
        ],
      },
      {
        id: "cs-2",
        scenario: "A school asks you to design a digital safety program for students aged 12–17. What's your approach?",
        options: [
          { label: "Build a scenario-based curriculum where they experience threats in a safe simulation", value: "a", weights: { execution: 2, motivation: 3, depth: 1 } },
          { label: "Start with the psychology of online manipulation — teach them to think, not just follow rules", value: "b", weights: { cognitive: 3, depth: 2, motivation: 1 } },
          { label: "Create practical workshops — password management, privacy settings, phishing recognition", value: "c", weights: { execution: 3, timeHorizon: 2, risk: 1 } },
          { label: "Train teachers and parents first — sustainable safety culture starts with the adults", value: "d", weights: { timeHorizon: 3, motivation: 2, depth: 1 } },
        ],
      },
      {
        id: "cs-3",
        scenario: "You discover a vulnerability in a widely-used system. The vendor hasn't patched it yet.",
        options: [
          { label: "Document it meticulously and report through responsible disclosure channels", value: "a", weights: { depth: 3, timeHorizon: 2, cognitive: 1 } },
          { label: "Test the vulnerability in a sandboxed environment to understand its full impact", value: "b", weights: { cognitive: 3, risk: 2, depth: 1 } },
          { label: "Develop a temporary mitigation and share it with affected organizations", value: "c", weights: { execution: 3, motivation: 2, risk: 1 } },
          { label: "Publish an advisory that raises awareness without revealing exploitation details", value: "d", weights: { motivation: 3, timeHorizon: 2, risk: 0 } },
        ],
      },
      {
        id: "cs-4",
        scenario: "Your team can either invest in better detection systems or in offensive security training. Budget only covers one.",
        options: [
          { label: "Detection — you can't defend against what you can't see", value: "a", weights: { depth: 2, timeHorizon: 3, execution: 1 } },
          { label: "Offensive training — understanding attackers is the best defense", value: "b", weights: { cognitive: 3, risk: 3, motivation: 0 } },
          { label: "Split the budget and build a hybrid blue-red team capability", value: "c", weights: { execution: 2, cognitive: 2, risk: 2 } },
          { label: "Invest in training first — tools without skilled operators are expensive decoration", value: "d", weights: { motivation: 3, depth: 2, timeHorizon: 1 } },
        ],
      },
      {
        id: "cs-5",
        scenario: "You're building your cybersecurity career. Which focus excites you most?",
        options: [
          { label: "Threat hunting and intelligence — finding attackers before they strike", value: "a", weights: { cognitive: 3, depth: 2, risk: 1 } },
          { label: "Penetration testing — legally breaking systems to make them stronger", value: "b", weights: { risk: 3, execution: 2, cognitive: 1 } },
          { label: "Security operations — building the systems that keep organizations safe 24/7", value: "c", weights: { execution: 3, timeHorizon: 2, depth: 1 } },
          { label: "Digital safety education — protecting communities who don't know they're vulnerable", value: "d", weights: { motivation: 3, timeHorizon: 2, depth: 1 } },
        ],
      },
      {
        id: "cs-6",
        scenario: "A non-technical executive asks you to explain why cybersecurity matters. You have two minutes.",
        options: [
          { label: "Tell a story of a real breach — show the human and financial cost vividly", value: "a", weights: { motivation: 3, execution: 2, risk: 1 } },
          { label: "Present three statistics and one actionable recommendation they can implement today", value: "b", weights: { execution: 3, cognitive: 2, timeHorizon: 1 } },
          { label: "Explain it as insurance — the cost of prevention vs the cost of breach", value: "c", weights: { cognitive: 2, timeHorizon: 3, depth: 1 } },
          { label: "Run a live demo — show them how easy it is to compromise an unprotected system", value: "d", weights: { risk: 2, depth: 2, execution: 2 } },
        ],
      },
    ],
    archetypes: [
      {
        id: "security-analyst",
        title: "The Security Analyst",
        description: "You're methodical, detail-oriented, and thrive in structured environments. Your strength is monitoring, detecting, and responding to threats with precision and discipline.",
        strengths: ["Threat detection", "Log analysis", "Incident response"],
        recommendedPathId: "cybersecurity-analyst",
        alternatePathIds: ["digital-safety-advocate"],
      },
      {
        id: "offensive-specialist",
        title: "The Offensive Specialist",
        description: "You think like an attacker. Your curiosity about how things break, combined with strong ethics, makes you perfectly suited for penetration testing and vulnerability research.",
        strengths: ["Penetration testing", "Vulnerability research", "Creative problem-solving"],
        recommendedPathId: "ethical-hacker",
        alternatePathIds: ["cybersecurity-analyst"],
      },
      {
        id: "community-defender",
        title: "The Community Defender",
        description: "You see cybersecurity as a social responsibility. Your ability to communicate complex threats in accessible language makes you a powerful force for community digital resilience.",
        strengths: ["Security communication", "Training design", "Community engagement"],
        recommendedPathId: "digital-safety-advocate",
        alternatePathIds: ["cybersecurity-analyst"],
      },
    ],
  },

  // ─── Pillar 5: Programming, Data & AI ────────────────────────
  "programming-systems": {
    pillarId: "programming-systems",
    dimensions: [
      { id: "cognitive", label: "Cognitive Style" },
      { id: "execution", label: "Execution Style" },
      { id: "risk", label: "Risk Orientation" },
      { id: "timeHorizon", label: "Time Horizon" },
      { id: "depth", label: "Depth Preference" },
      { id: "motivation", label: "Motivation Driver" },
    ],
    questions: [
      {
        id: "ps-1",
        scenario: "You're given a messy dataset with 50,000 rows and told to 'find something useful.' Where do you start?",
        options: [
          { label: "Clean the data first — good analysis starts with good data hygiene", value: "a", weights: { depth: 3, cognitive: 2, execution: 1 } },
          { label: "Run quick exploratory analysis — visualize distributions, spot outliers, find patterns", value: "b", weights: { cognitive: 3, execution: 2, risk: 1 } },
          { label: "Ask who needs the insight and what decision it should inform — work backward from the use case", value: "c", weights: { motivation: 3, timeHorizon: 2, execution: 1 } },
          { label: "Build a pipeline that can process this and future datasets — invest in infrastructure", value: "d", weights: { execution: 3, timeHorizon: 2, depth: 1 } },
        ],
      },
      {
        id: "ps-2",
        scenario: "You've built a working prototype that solves a real problem. What's your next move?",
        options: [
          { label: "Refactor the code — make it production-ready with proper architecture and tests", value: "a", weights: { depth: 3, execution: 2, timeHorizon: 1 } },
          { label: "Ship it to users immediately — get real feedback before investing more time", value: "b", weights: { execution: 3, risk: 2, motivation: 1 } },
          { label: "Add intelligence — integrate ML or AI to make it smarter over time", value: "c", weights: { cognitive: 3, depth: 2, risk: 1 } },
          { label: "Document everything and share it open-source — let the community improve it", value: "d", weights: { motivation: 3, timeHorizon: 2, execution: 1 } },
        ],
      },
      {
        id: "ps-3",
        scenario: "A client needs a solution: it could be built as a web app, a data pipeline, or an IoT system. You get to choose.",
        options: [
          { label: "Web app — it reaches the most users with the lowest barrier to entry", value: "a", weights: { execution: 3, motivation: 2, risk: 1 } },
          { label: "Data pipeline — the real value is in processing and analyzing their data at scale", value: "b", weights: { cognitive: 3, depth: 2, timeHorizon: 1 } },
          { label: "IoT system — connecting the physical and digital worlds creates the most impact here", value: "c", weights: { risk: 2, depth: 3, execution: 1 } },
          { label: "Hybrid — build a web frontend with IoT data feeding into ML models", value: "d", weights: { cognitive: 2, execution: 2, depth: 2 } },
        ],
      },
      {
        id: "ps-4",
        scenario: "You encounter a bug that's been open for weeks. Other developers have given up on it.",
        options: [
          { label: "Systematically reproduce it and trace the logic step by step until you find the root cause", value: "a", weights: { depth: 3, cognitive: 2, execution: 1 } },
          { label: "Rewrite the problematic module — sometimes it's faster to rebuild than to debug", value: "b", weights: { execution: 3, risk: 2, timeHorizon: 1 } },
          { label: "Read the source code of the dependencies involved — the bug might not be in your code", value: "c", weights: { cognitive: 3, depth: 2, timeHorizon: 1 } },
          { label: "Write a comprehensive test suite first — the tests will reveal the bug's location", value: "d", weights: { execution: 2, timeHorizon: 3, depth: 1 } },
        ],
      },
      {
        id: "ps-5",
        scenario: "You have one year to build deep expertise in one technical area. Which do you choose?",
        options: [
          { label: "Full-stack web development — build complete applications from database to frontend", value: "a", weights: { execution: 3, motivation: 2, risk: 1 } },
          { label: "Data science and ML — extract intelligence from data and build predictive systems", value: "b", weights: { cognitive: 3, depth: 2, timeHorizon: 1 } },
          { label: "IoT and embedded systems — program devices that interact with the physical world", value: "c", weights: { risk: 2, depth: 3, execution: 1 } },
          { label: "Systems architecture — design the infrastructure that other developers build on", value: "d", weights: { timeHorizon: 3, depth: 2, cognitive: 1 } },
        ],
      },
      {
        id: "ps-6",
        scenario: "You're mentoring a junior developer who learns differently from you. How do you adapt?",
        options: [
          { label: "Give them progressively harder problems — struggle is the best teacher", value: "a", weights: { depth: 2, cognitive: 2, risk: 2 } },
          { label: "Pair program with them — show your thought process in real-time", value: "b", weights: { execution: 3, motivation: 2, depth: 1 } },
          { label: "Point them to the best resources and check in weekly — autonomy builds real skill", value: "c", weights: { timeHorizon: 3, motivation: 2, risk: 1 } },
          { label: "Have them build a project from scratch — learning by doing beats learning by reading", value: "d", weights: { execution: 2, risk: 2, motivation: 2 } },
        ],
      },
    ],
    archetypes: [
      {
        id: "software-engineer",
        title: "The Software Engineer",
        description: "You're a builder at heart. You think in applications, user experiences, and shipping working software. Your drive is to create tools that people actually use.",
        strengths: ["Application development", "Problem-solving", "Rapid prototyping"],
        recommendedPathId: "software-developer",
        alternatePathIds: ["data-scientist"],
      },
      {
        id: "data-intelligence",
        title: "The Data Intelligence Specialist",
        description: "You see the world through data. Patterns, anomalies, and predictions fascinate you. Your analytical depth and mathematical intuition make you a natural data scientist.",
        strengths: ["Statistical analysis", "Pattern recognition", "Predictive modeling"],
        recommendedPathId: "data-scientist",
        alternatePathIds: ["software-developer", "ai-engineer"],
      },
      {
        id: "systems-innovator",
        title: "The Systems Innovator",
        description: "You bridge the digital and physical worlds. Your curiosity about hardware, sensors, and intelligent systems drives you toward the frontier of connected technology.",
        strengths: ["IoT design", "ML integration", "Edge computing"],
        recommendedPathId: "ai-engineer",
        alternatePathIds: ["data-scientist"],
      },
    ],
  },

  // ─── Pillar 6: Creator Economy ───────────────────────────────
  "creator-economy": {
    pillarId: "creator-economy",
    dimensions: [
      { id: "cognitive", label: "Cognitive Style" },
      { id: "execution", label: "Execution Style" },
      { id: "risk", label: "Risk Orientation" },
      { id: "timeHorizon", label: "Time Horizon" },
      { id: "depth", label: "Depth Preference" },
      { id: "motivation", label: "Motivation Driver" },
    ],
    questions: [
      {
        id: "ce-1",
        scenario: "You have a compelling idea for digital content. What's your first step?",
        options: [
          { label: "Write it out — start with a blog post or article to crystallize the idea", value: "a", weights: { depth: 3, cognitive: 2, execution: 1 } },
          { label: "Record a video immediately — capture the raw energy while it's fresh", value: "b", weights: { execution: 3, risk: 2, motivation: 1 } },
          { label: "Research the market — who else talks about this, and what angle is underserved?", value: "c", weights: { cognitive: 3, timeHorizon: 2, depth: 1 } },
          { label: "Build a product around it — content should lead to something you can sell", value: "d", weights: { motivation: 2, execution: 2, risk: 2 } },
        ],
      },
      {
        id: "ce-2",
        scenario: "Your content is getting modest views but high engagement from a small audience. What do you do?",
        options: [
          { label: "Double down on this audience — depth of connection beats breadth of reach", value: "a", weights: { depth: 3, motivation: 2, timeHorizon: 1 } },
          { label: "Analyze what's resonating and create more of it — let the data guide you", value: "b", weights: { cognitive: 3, execution: 2, depth: 1 } },
          { label: "Expand to a new platform to reach a wider audience while maintaining the core", value: "c", weights: { risk: 2, execution: 2, motivation: 2 } },
          { label: "Monetize this loyal audience now — create a premium offering for your most engaged followers", value: "d", weights: { execution: 3, motivation: 2, timeHorizon: 1 } },
        ],
      },
      {
        id: "ce-3",
        scenario: "You can only invest in one skill for the next six months. Which do you choose?",
        options: [
          { label: "Writing — the foundational skill behind all great content", value: "a", weights: { depth: 3, cognitive: 2, timeHorizon: 1 } },
          { label: "Video production — the dominant medium for digital engagement", value: "b", weights: { execution: 3, risk: 1, motivation: 2 } },
          { label: "Marketing and distribution — great content fails without great reach", value: "c", weights: { cognitive: 2, risk: 2, execution: 2 } },
          { label: "Business and monetization — turn creative work into sustainable income", value: "d", weights: { motivation: 3, timeHorizon: 2, execution: 1 } },
        ],
      },
      {
        id: "ce-4",
        scenario: "A brand offers you a sponsorship that pays well but doesn't align perfectly with your values. What's your response?",
        options: [
          { label: "Decline — audience trust is worth more than any sponsorship", value: "a", weights: { depth: 3, timeHorizon: 2, motivation: 1 } },
          { label: "Negotiate terms that let you maintain authenticity while taking the deal", value: "b", weights: { cognitive: 3, execution: 2, risk: 1 } },
          { label: "Accept — use the revenue to fund the content you actually want to create", value: "c", weights: { risk: 2, execution: 2, motivation: 2 } },
          { label: "Counter-propose a different collaboration format that serves both parties better", value: "d", weights: { cognitive: 2, motivation: 2, execution: 2 } },
        ],
      },
      {
        id: "ce-5",
        scenario: "You envision your digital career in 3 years. What does success look like?",
        options: [
          { label: "A published body of written work that establishes you as an authority in your field", value: "a", weights: { depth: 3, timeHorizon: 2, cognitive: 1 } },
          { label: "A YouTube channel with a loyal community and multiple revenue streams", value: "b", weights: { execution: 2, motivation: 3, risk: 1 } },
          { label: "A digital business with products, services, and automated income systems", value: "c", weights: { execution: 3, risk: 2, timeHorizon: 1 } },
          { label: "A platform-agnostic personal brand that transcends any single medium", value: "d", weights: { cognitive: 2, timeHorizon: 3, motivation: 1 } },
        ],
      },
      {
        id: "ce-6",
        scenario: "You're burnt out from consistent content creation. How do you recover without losing momentum?",
        options: [
          { label: "Batch-create content in focused sprints, then rest — design your workflow for sustainability", value: "a", weights: { execution: 3, timeHorizon: 2, cognitive: 1 } },
          { label: "Go back to basics — reconnect with why you started and create purely for yourself", value: "b", weights: { depth: 3, motivation: 2, risk: 1 } },
          { label: "Delegate or outsource — build a team so the machine runs without you being the engine", value: "c", weights: { risk: 2, execution: 2, motivation: 2 } },
          { label: "Pivot your format — burnout often signals the need for creative evolution, not rest", value: "d", weights: { cognitive: 2, risk: 2, motivation: 2 } },
        ],
      },
    ],
    archetypes: [
      {
        id: "content-writer",
        title: "The Content Writer",
        description: "Your power is the written word. You think in narratives, arguments, and ideas. Your depth of thought and ability to articulate complex concepts makes you a natural writer and publisher.",
        strengths: ["Copywriting", "Long-form content", "Editorial strategy"],
        recommendedPathId: "content-creator",
        alternatePathIds: ["digital-business-builder"],
      },
      {
        id: "video-creator",
        title: "The Video Creator",
        description: "You communicate through visuals and presence. Your energy, creativity, and willingness to show up on camera make you perfectly suited for the world's dominant content medium.",
        strengths: ["Video production", "On-camera presence", "Community building"],
        recommendedPathId: "youtube-entrepreneur",
        alternatePathIds: ["content-creator"],
      },
      {
        id: "digital-mogul",
        title: "The Digital Mogul",
        description: "You see content as a business engine. Your entrepreneurial instinct drives you to build systems, products, and revenue models around creative work.",
        strengths: ["Business model design", "Product creation", "Revenue engineering"],
        recommendedPathId: "digital-business-builder",
        alternatePathIds: ["youtube-entrepreneur"],
      },
    ],
  },

  // ─── Pillar 7: Civic Leadership ──────────────────────────────
  "civic-leadership": {
    pillarId: "civic-leadership",
    dimensions: [
      { id: "cognitive", label: "Cognitive Style" },
      { id: "execution", label: "Execution Style" },
      { id: "risk", label: "Risk Orientation" },
      { id: "timeHorizon", label: "Time Horizon" },
      { id: "depth", label: "Depth Preference" },
      { id: "motivation", label: "Motivation Driver" },
    ],
    questions: [
      {
        id: "cl-1",
        scenario: "Your community faces a recurring problem that local leadership has failed to address. What's your approach?",
        options: [
          { label: "Research the root causes and build a data-backed proposal for change", value: "a", weights: { cognitive: 3, depth: 2, timeHorizon: 1 } },
          { label: "Organize affected community members and amplify their collective voice", value: "b", weights: { motivation: 3, execution: 2, risk: 1 } },
          { label: "Build a practical solution yourself and demonstrate it works — action speaks louder than petitions", value: "c", weights: { execution: 3, risk: 2, depth: 1 } },
          { label: "Engage existing leaders privately — sustainable change requires working within systems, not against them", value: "d", weights: { timeHorizon: 3, cognitive: 2, motivation: 1 } },
        ],
      },
      {
        id: "cl-2",
        scenario: "You're selected to lead a community project with diverse stakeholders who disagree on priorities.",
        options: [
          { label: "Facilitate structured dialogue — let every voice be heard before deciding direction", value: "a", weights: { motivation: 3, cognitive: 2, depth: 1 } },
          { label: "Identify the non-negotiables and build consensus around those first", value: "b", weights: { cognitive: 3, execution: 2, timeHorizon: 1 } },
          { label: "Start with a quick win that benefits everyone — momentum creates alignment", value: "c", weights: { execution: 3, risk: 2, motivation: 1 } },
          { label: "Map the power dynamics and work with the most influential stakeholders to align the rest", value: "d", weights: { depth: 2, cognitive: 2, risk: 2 } },
        ],
      },
      {
        id: "cl-3",
        scenario: "You discover that a governance process in your organization is technically legal but ethically questionable.",
        options: [
          { label: "Document the ethical gap and propose a reform with clear alternatives", value: "a", weights: { depth: 3, cognitive: 2, timeHorizon: 1 } },
          { label: "Raise it publicly — transparency forces accountability", value: "b", weights: { risk: 3, motivation: 2, execution: 1 } },
          { label: "Work behind the scenes to change the policy before it causes visible harm", value: "c", weights: { execution: 2, timeHorizon: 3, cognitive: 1 } },
          { label: "Build a coalition of allies who share the concern — collective pressure is more effective", value: "d", weights: { motivation: 3, execution: 2, risk: 1 } },
        ],
      },
      {
        id: "cl-4",
        scenario: "You have the opportunity to run for a local leadership position. What motivates your decision?",
        options: [
          { label: "The platform to implement specific policy changes you've been advocating for", value: "a", weights: { depth: 3, timeHorizon: 2, cognitive: 1 } },
          { label: "The ability to represent and amplify voices that are currently unheard", value: "b", weights: { motivation: 3, risk: 1, execution: 2 } },
          { label: "The chance to build institutional capacity that outlasts your tenure", value: "c", weights: { timeHorizon: 3, depth: 2, execution: 1 } },
          { label: "The challenge itself — proving that ethical, competent leadership is possible", value: "d", weights: { risk: 2, execution: 2, motivation: 2 } },
        ],
      },
      {
        id: "cl-5",
        scenario: "A digital tool could dramatically improve transparency in local governance, but adoption requires overcoming resistance from traditional leaders.",
        options: [
          { label: "Demonstrate the tool's value with a small pilot — results overcome resistance", value: "a", weights: { execution: 3, cognitive: 2, risk: 1 } },
          { label: "Train traditional leaders to use it themselves — ownership removes resistance", value: "b", weights: { motivation: 3, timeHorizon: 2, depth: 1 } },
          { label: "Build the tool around existing processes — minimize disruption while maximizing transparency", value: "c", weights: { cognitive: 3, depth: 2, timeHorizon: 1 } },
          { label: "Mobilize citizen demand for transparency — let the pressure come from the people, not the technology", value: "d", weights: { risk: 2, motivation: 2, execution: 2 } },
        ],
      },
      {
        id: "cl-6",
        scenario: "You envision your civic impact in ten years. What legacy do you want to build?",
        options: [
          { label: "Policies I championed that measurably improved community welfare", value: "a", weights: { depth: 3, cognitive: 2, timeHorizon: 1 } },
          { label: "A generation of young leaders I trained and inspired to serve", value: "b", weights: { motivation: 3, timeHorizon: 2, depth: 1 } },
          { label: "Institutions and systems that function effectively regardless of who leads them", value: "c", weights: { timeHorizon: 3, execution: 2, cognitive: 1 } },
          { label: "A track record of projects that demonstrated what ethical governance looks like in practice", value: "d", weights: { execution: 3, depth: 2, risk: 1 } },
        ],
      },
    ],
    archetypes: [
      {
        id: "community-organizer",
        title: "The Community Organizer",
        description: "You lead by mobilizing. Your ability to unite diverse voices, build coalitions, and create grassroots momentum makes you a natural force for community-driven change.",
        strengths: ["Community mobilization", "Stakeholder engagement", "Grassroots advocacy"],
        recommendedPathId: "community-leader",
        alternatePathIds: ["policy-analyst"],
      },
      {
        id: "policy-strategist",
        title: "The Policy Strategist",
        description: "You think in systems and structures. Your analytical approach to governance, combined with deep policy knowledge, positions you to design institutional frameworks that create lasting impact.",
        strengths: ["Policy analysis", "Institutional design", "Strategic planning"],
        recommendedPathId: "policy-analyst",
        alternatePathIds: ["community-leader", "governance-innovator"],
      },
      {
        id: "governance-pioneer",
        title: "The Governance Pioneer",
        description: "You bridge traditional governance and modern tools. Your practical approach to digital civic engagement makes you a pioneer in transparent, technology-enabled public service.",
        strengths: ["Digital governance", "Innovation management", "Public communication"],
        recommendedPathId: "governance-innovator",
        alternatePathIds: ["policy-analyst"],
      },
    ],
  },
};
