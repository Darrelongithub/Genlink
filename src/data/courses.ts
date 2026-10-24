import courseMindset from "@/assets/course-mindset.jpg";
import courseFinance from "@/assets/course-finance.jpg";
import courseIct from "@/assets/course-ict.jpg";
import courseForex from "@/assets/course-forex.jpg";
import courseContent from "@/assets/course-content.jpg";
import courseYoutube from "@/assets/course-youtube.jpg";
import courseCybersecurity from "@/assets/course-cybersecurity.jpg";
import courseCloud from "@/assets/course-cloud.jpg";
import coursePython from "@/assets/course-python.jpg";
import courseDatascience from "@/assets/course-datascience.jpg";
import courseIot from "@/assets/course-iot.jpg";
import courseAi from "@/assets/course-ai.jpg";
import courseAiLiteracy from "@/assets/course-ai-literacy.jpg";
import courseDataLiteracy from "@/assets/course-data-literacy.jpg";
import courseDigitalProductivity from "@/assets/course-digital-productivity.jpg";
import courseAutomation from "@/assets/course-automation.jpg";
import courseDigitalCommunication from "@/assets/course-digital-communication.jpg";
import courseCivicLeadership from "@/assets/course-civic-leadership.jpg";

// ─── Progression Levels ────────────────────────────────────────
export type ProgressionLevel = "foundation" | "practitioner" | "specialist" | "elite";

export const progressionLevels: Record<ProgressionLevel, { label: string; description: string; isFree: boolean }> = {
  foundation: { label: "Foundation", description: "Free introductory modules — immediate value", isFree: true },
  practitioner: { label: "Practitioner", description: "Applied skills and guided practice", isFree: false },
  specialist: { label: "Specialist", description: "Deep expertise and tool mastery", isFree: false },
  elite: { label: "Elite", description: "Capstone project and deployment", isFree: false },
};

// ─── 5-Layer Course Structure ──────────────────────────────────
export interface CourseLayer {
  id: string;
  name: string;
  description: string;
  modules: string[];
}

export const courseLayerTemplate: Omit<CourseLayer, "modules">[] = [
  { id: "identity", name: "Identity & Mindset Foundation", description: "Establish your purpose and mental framework" },
  { id: "core", name: "Core Knowledge", description: "Master essential theory and concepts" },
  { id: "applied", name: "Applied Skill", description: "Hands-on practice and real-world exercises" },
  { id: "tools", name: "Tool Mastery", description: "Proficiency with industry-standard tools" },
  { id: "deploy", name: "Deployment & Monetization", description: "Launch, earn, and create impact" },
];

// ─── Learning Path ─────────────────────────────────────────────
export interface LearningPath {
  id: string;
  title: string;
  description: string;
  targetRole: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  estimatedWeeks: number;
  courseIds: string[];
  capstoneProject?: string;
  careerOutcomes?: string[];
  competencyMilestones?: string[];
  requiredFoundation?: string;
  certificationTier?: string;
  comparisonData?: Record<string, string>;
}

// ─── Pillar Unit (grouping of paths within a pillar) ──────────
export interface PillarUnit {
  id: string;
  title: string;
  description: string;
  icon: string;
  learningPaths: LearningPath[];
}

// ─── Pillar ────────────────────────────────────────────────────
export interface Pillar {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  description: string;
  focusAreas: string[];
  whoIsItFor: string;
  coreCompetencies: string[];
  learningPaths: LearningPath[];
  courseIds: string[];
  units?: PillarUnit[];
}

// ─── Learning Path Comparison Metrics ──────────────────────────
export interface PathComparisonMetric {
  label: string;
  key: string;
}

export const comparisonMetrics: PathComparisonMetric[] = [
  { label: "Technical Depth", key: "technicalDepth" },
  { label: "Coding Intensity", key: "codingIntensity" },
  { label: "Infrastructure Exposure", key: "infrastructureExposure" },
  { label: "Career Environment", key: "careerEnvironment" },
  { label: "Difficulty Level", key: "difficultyLevel" },
  { label: "Duration", key: "duration" },
];

// ─── Course ────────────────────────────────────────────────────
export interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  isPremium: boolean;
  price?: string;
  image: string;
  rating: number;
  category: string;
  pillarId: string;
  subcategory?: string;
  overview: string;
  whatYouLearn: string[];
  prerequisites: string[];
  responsibleUse?: string[];
  layers: CourseLayer[];
  progressionLevel: ProgressionLevel;
  hasCapstone: boolean;
  entrepreneurialModule: boolean;
}

// ─── Entrepreneurial Intelligence Core (shared across premium) ─
export const entrepreneurialIntelligenceModule = {
  title: "Entrepreneurial Intelligence Core",
  topics: [
    "Pitching ideas and presenting with confidence",
    "Building effective pitch decks",
    "Intellectual property basics for Kenya",
    "Business structures and registration in Kenya",
    "Market positioning and competitive analysis",
    "Professional communication for business",
  ],
};

// ─── Pillar 1 Psychological Profiling ──────────────────────────
export interface ProfileQuestion {
  id: string;
  question: string;
  options: { label: string; value: string; traits: string[] }[];
}

export const psychProfileQuestions: ProfileQuestion[] = [
  {
    id: "q1",
    question: "When faced with a major life decision, I tend to…",
    options: [
      { label: "Reflect deeply before acting", value: "reflective", traits: ["discipline", "introspection"] },
      { label: "Seek advice and rally others", value: "collaborative", traits: ["leadership", "influence"] },
      { label: "Build a system or framework to decide", value: "systematic", traits: ["systems", "optimization"] },
      { label: "Trust my instinct and move quickly", value: "intuitive", traits: ["action", "resilience"] },
    ],
  },
  {
    id: "q2",
    question: "What motivates me most?",
    options: [
      { label: "Inner peace and personal growth", value: "growth", traits: ["discipline", "introspection"] },
      { label: "Inspiring and leading others", value: "impact", traits: ["leadership", "influence"] },
      { label: "Efficiency and measurable results", value: "results", traits: ["systems", "optimization"] },
      { label: "Overcoming challenges and adversity", value: "challenge", traits: ["resilience", "action"] },
    ],
  },
  {
    id: "q3",
    question: "In a team setting, I naturally…",
    options: [
      { label: "Observe and contribute thoughtfully", value: "observer", traits: ["introspection", "discipline"] },
      { label: "Take charge and set direction", value: "leader", traits: ["leadership", "influence"] },
      { label: "Organize tasks and track progress", value: "organizer", traits: ["systems", "optimization"] },
      { label: "Encourage and keep morale high", value: "motivator", traits: ["resilience", "influence"] },
    ],
  },
  {
    id: "q4",
    question: "My biggest area for growth is…",
    options: [
      { label: "Building consistent daily habits", value: "habits", traits: ["discipline", "systems"] },
      { label: "Communicating with more influence", value: "communication", traits: ["leadership", "influence"] },
      { label: "Creating scalable personal systems", value: "scaling", traits: ["systems", "optimization"] },
      { label: "Managing stress and staying focused", value: "focus", traits: ["resilience", "introspection"] },
    ],
  },
  {
    id: "q5",
    question: "When I imagine my best self, I see someone who…",
    options: [
      { label: "Lives with intention and self-mastery", value: "master", traits: ["discipline", "introspection"] },
      { label: "Leads movements and transforms communities", value: "transformer", traits: ["leadership", "influence"] },
      { label: "Designs systems that run without constant effort", value: "architect", traits: ["systems", "optimization"] },
      { label: "Stands strong through any storm", value: "resilient", traits: ["resilience", "action"] },
    ],
  },
];

export type ProfileType = "identity-builder" | "leadership-psychologist" | "performance-architect";

// ─── Pillar 2 Financial Profiling ──────────────────────────────
export type FinancialProfileType = "stabilizer" | "analyst" | "builder" | "architect";

export const financialProfileQuestions: ProfileQuestion[] = [
  {
    id: "fq1",
    question: "When you receive unexpected money, your first instinct is to…",
    options: [
      { label: "Save it immediately for emergencies", value: "save", traits: ["stability", "caution"] },
      { label: "Research the best investment options", value: "research", traits: ["analysis", "growth"] },
      { label: "Invest it into a business idea", value: "invest-biz", traits: ["enterprise", "risk"] },
      { label: "Build a system to generate more from it", value: "systematize", traits: ["systems", "growth"] },
    ],
  },
  {
    id: "fq2",
    question: "How do you feel about financial risk?",
    options: [
      { label: "I avoid it — security comes first", value: "avoid", traits: ["stability", "caution"] },
      { label: "I study risk carefully before committing", value: "study", traits: ["analysis", "caution"] },
      { label: "Calculated risk is how wealth is built", value: "calculated", traits: ["enterprise", "growth"] },
      { label: "I design systems to manage risk automatically", value: "design", traits: ["systems", "analysis"] },
    ],
  },
  {
    id: "fq3",
    question: "Your ideal financial future looks like…",
    options: [
      { label: "Debt-free with a strong emergency fund", value: "secure", traits: ["stability", "caution"] },
      { label: "A diversified portfolio generating passive income", value: "portfolio", traits: ["analysis", "growth"] },
      { label: "Multiple income streams from businesses I built", value: "entrepreneur", traits: ["enterprise", "risk"] },
      { label: "Automated wealth systems running in the background", value: "automated", traits: ["systems", "growth"] },
    ],
  },
  {
    id: "fq4",
    question: "What's your current financial knowledge level?",
    options: [
      { label: "I need to learn the basics first", value: "basics", traits: ["stability", "caution"] },
      { label: "I understand investing but want deeper analysis skills", value: "intermediate", traits: ["analysis", "growth"] },
      { label: "I've started businesses but need better financial structure", value: "business", traits: ["enterprise", "systems"] },
      { label: "I'm comfortable with finance and want to architect income systems", value: "advanced", traits: ["systems", "enterprise"] },
    ],
  },
  {
    id: "fq5",
    question: "When it comes to money, your biggest challenge is…",
    options: [
      { label: "Spending discipline and sticking to budgets", value: "discipline", traits: ["stability", "caution"] },
      { label: "Knowing where to invest and when", value: "timing", traits: ["analysis", "growth"] },
      { label: "Turning ideas into profitable ventures", value: "monetizing", traits: ["enterprise", "risk"] },
      { label: "Building scalable systems instead of trading time for money", value: "scaling", traits: ["systems", "enterprise"] },
    ],
  },
];

export const financialProfileTypeMap: Record<FinancialProfileType, { title: string; description: string; pathId: string }> = {
  stabilizer: {
    title: "The Stabilizer",
    description: "You prioritize security, predictability, and financial peace. Your strength is building a rock-solid foundation before taking any growth steps.",
    pathId: "personal-finance-stability",
  },
  analyst: {
    title: "The Analyst",
    description: "You approach money with data and logic. You research, compare, and calculate before committing. Markets and portfolios fascinate you.",
    pathId: "investor-market-intelligence",
  },
  builder: {
    title: "The Builder",
    description: "You see money as fuel for creation. You're entrepreneurial, resourceful, and always looking for the next opportunity to build income.",
    pathId: "income-systems-enterprise",
  },
  architect: {
    title: "The Architect",
    description: "You think in systems. You want automated wealth engines, scalable revenue models, and infrastructure that works without your constant attention.",
    pathId: "income-systems-enterprise",
  },
};

export const determineFinancialProfileType = (answers: Record<string, string[]>): FinancialProfileType => {
  const traitCounts: Record<string, number> = {};
  Object.values(answers).flat().forEach(trait => {
    traitCounts[trait] = (traitCounts[trait] || 0) + 1;
  });

  const stability = (traitCounts["stability"] || 0) + (traitCounts["caution"] || 0);
  const analysis = (traitCounts["analysis"] || 0) + (traitCounts["growth"] || 0);
  const enterprise = (traitCounts["enterprise"] || 0) + (traitCounts["risk"] || 0);
  const systems = (traitCounts["systems"] || 0);

  const max = Math.max(stability, analysis, enterprise, systems);
  if (max === stability) return "stabilizer";
  if (max === analysis) return "analyst";
  if (max === enterprise) return "builder";
  return "architect";
};

export const profileTypeMap: Record<ProfileType, { title: string; description: string; pathId: string }> = {
  "identity-builder": {
    title: "The Identity Builder",
    description: "You're driven by self-awareness, habit formation, and the pursuit of personal integrity. Your power lies in deep inner work.",
    pathId: "identity-discipline-builder",
  },
  "leadership-psychologist": {
    title: "The Influence Architect",
    description: "You naturally lead, persuade, and inspire. Your edge is understanding people and shaping group outcomes.",
    pathId: "leadership-psychology",
  },
  "performance-architect": {
    title: "The Systems Thinker",
    description: "You optimize everything. You think in frameworks, build routines, and design your life for peak output.",
    pathId: "high-performance-architect",
  },
};

export const determineProfileType = (answers: Record<string, string[]>): ProfileType => {
  const traitCounts: Record<string, number> = {};
  Object.values(answers).flat().forEach(trait => {
    traitCounts[trait] = (traitCounts[trait] || 0) + 1;
  });

  const discipline = (traitCounts["discipline"] || 0) + (traitCounts["introspection"] || 0);
  const leadership = (traitCounts["leadership"] || 0) + (traitCounts["influence"] || 0);
  const systems = (traitCounts["systems"] || 0) + (traitCounts["optimization"] || 0);

  if (leadership >= discipline && leadership >= systems) return "leadership-psychologist";
  if (systems >= discipline && systems >= leadership) return "performance-architect";
  return "identity-builder";
};

// ═══════════════════════════════════════════════════════════════
// COURSES — merged from 17 originals into 7 pillars
// ═══════════════════════════════════════════════════════════════

export const courses: Course[] = [
  // ──────────── PILLAR 1: Mind Architecture & Identity Design (Foundation) ──────
  {
    id: "mind-architecture",
    title: "Mind Architecture & Identity Design",
    description: "The mandatory foundation course for Pillar 1. Build your internal operating system — identity, discipline, and cognitive frameworks — before choosing your specialization path.",
    duration: "4 weeks",
    isPremium: false,
    image: courseMindset,
    rating: 4.9,
    category: "spiritual",
    pillarId: "personal-mastery",
    overview: "This is not a course — it's an internal operating system. Mind Architecture lays the foundation for everything in Personal Mastery. You'll map your identity, build cognitive discipline, and complete a psychological profiling assessment that recommends your ideal learning path.",
    whatYouLearn: [
      "Identity mapping and core values discovery",
      "Cognitive discipline and attention management",
      "Breaking limiting beliefs with evidence-based techniques",
      "Building a personal operating system for daily life",
      "Psychological self-assessment and profile generation",
      "Ethical decision-making frameworks",
    ],
    prerequisites: [
      "Open mind and commitment to honest self-reflection",
      "Journal for reflection exercises",
      "30 minutes daily for 4 weeks",
    ],
    responsibleUse: [
      "Self-mastery is the foundation of all other mastery",
      "Technology aids growth — but discipline drives it",
      "Guard your attention as fiercely as your finances",
      "Wisdom is knowing what to ignore",
      "Character is built in silence, not in feeds",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Foundation", description: "Map your identity and core values", modules: ["Who Am I? — Identity Mapping", "Core Values Discovery Workshop", "Psychological Profiling Assessment"] },
      { id: "core", name: "Core Knowledge", description: "Cognitive science and mental frameworks", modules: ["The Architecture of Thought", "Cognitive Biases & Mental Traps", "Attention Economics"] },
      { id: "applied", name: "Applied Skill", description: "Build your personal operating system", modules: ["Daily Discipline Protocol Design", "Breaking Limiting Beliefs Lab", "Ethical Decision Simulations"] },
      { id: "tools", name: "Tool Mastery", description: "Habit and reflection tools", modules: ["Habit Tracker Setup & Mastery", "Journaling Systems for Growth", "Cognitive Resilience Measurement"] },
      { id: "deploy", name: "Deployment & Monetization", description: "Activate your operating system", modules: ["Personal Operating System Blueprint", "Path Selection & Commitment"] },
    ],
    progressionLevel: "foundation",
    hasCapstone: false,
    entrepreneurialModule: false,
  },

  // ──────────── PILLAR 1: Identity & Discipline Builder Path ──────
  {
    id: "identity-discipline",
    title: "Identity & Discipline Builder",
    description: "Deep inner work — master habits, self-regulation, and personal integrity. Build unshakeable discipline as your competitive advantage.",
    duration: "10 weeks",
    isPremium: true,
    price: "Ksh 8,999",
    image: courseMindset,
    rating: 4.9,
    category: "spiritual",
    pillarId: "personal-mastery",
    overview: "Go deep into identity formation, habit science, and self-regulation. This path transforms your daily patterns into a high-performance routine built on integrity and purpose.",
    whatYouLearn: [
      "Advanced habit formation and behavioral design",
      "Self-regulation and emotional mastery",
      "Building accountability systems that stick",
      "Personal integrity as a competitive advantage",
      "Coaching others in discipline and identity",
      "Pitching, IP basics, and Kenyan business structures",
    ],
    prerequisites: [
      "Completed: Mind Architecture & Identity Design",
      "Commitment to 90-day habit challenge",
    ],
    responsibleUse: [
      "Discipline is freedom, not restriction",
      "Identity is built through action, not affirmation",
      "True change happens when no one is watching",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Foundation", description: "Your discipline identity", modules: ["The Disciplined Self — Identity Blueprint", "Emotional mastery fundamentals"] },
      { id: "core", name: "Core Knowledge", description: "Behavioral science and habit architecture", modules: ["The Science of Habits", "Self-Regulation Theory", "Willpower vs Systems"] },
      { id: "applied", name: "Applied Skill", description: "Build your discipline systems", modules: ["90-Day Habit Challenge", "Accountability Partner Protocol", "Ethical Decision Simulations (Advanced)"] },
      { id: "tools", name: "Tool Mastery", description: "Tracking and coaching tools", modules: ["Advanced Habit Analytics", "Coaching frameworks and tools", "Entrepreneurial Intelligence Core"] },
      { id: "deploy", name: "Deployment & Monetization", description: "Coach and lead others", modules: ["Launch Your Discipline Coaching Practice", "Capstone: Personal Transformation Portfolio"] },
    ],
    progressionLevel: "practitioner",
    hasCapstone: true,
    entrepreneurialModule: true,
  },

  // ──────────── PILLAR 1: Leadership Psychology & Influence ──────
  {
    id: "leadership-psychology",
    title: "Leadership Psychology & Influence",
    description: "Master the psychology of leadership, persuasion, and ethical influence. Learn to move people and shape outcomes.",
    duration: "12 weeks",
    isPremium: true,
    price: "Ksh 10,999",
    image: courseMindset,
    rating: 4.8,
    category: "spiritual",
    pillarId: "personal-mastery",
    overview: "Study the psychology behind great leadership. Master communication, ethical persuasion, conflict resolution, and team dynamics — grounded in African leadership philosophy.",
    whatYouLearn: [
      "Psychology of influence and ethical persuasion",
      "Conflict resolution and negotiation",
      "Public speaking and communication mastery",
      "Team dynamics and organizational psychology",
      "African leadership philosophy and Ubuntu",
      "Pitching, pitch decks, and professional communication",
    ],
    prerequisites: [
      "Completed: Mind Architecture & Identity Design",
      "Interest in leadership and people development",
    ],
    responsibleUse: [
      "Influence is a responsibility, not a weapon",
      "Lead by example before leading by instruction",
      "The most powerful leaders serve, not command",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Foundation", description: "Your leadership identity", modules: ["The Leader Within — Self-Assessment", "African Leadership Philosophy"] },
      { id: "core", name: "Core Knowledge", description: "Psychology of influence and leadership", modules: ["Influence Psychology & Ethical Persuasion", "Conflict Resolution Frameworks", "Organizational Behavior"] },
      { id: "applied", name: "Applied Skill", description: "Leadership in practice", modules: ["Public Speaking Intensive", "Negotiation Simulations", "Team Leadership Scenarios"] },
      { id: "tools", name: "Tool Mastery", description: "Communication and leadership tools", modules: ["Pitch Deck Mastery", "Professional Communication Systems", "Entrepreneurial Intelligence Core"] },
      { id: "deploy", name: "Deployment & Monetization", description: "Lead and consult", modules: ["Leadership Consulting Framework", "Capstone: Community Leadership Project"] },
    ],
    progressionLevel: "practitioner",
    hasCapstone: true,
    entrepreneurialModule: true,
  },

  // ──────────── PILLAR 1: High-Performance Systems Architect ──────
  {
    id: "performance-architect",
    title: "High-Performance Systems Architect",
    description: "Design personal systems for peak performance — routines, workflows, energy management, and scalable productivity.",
    duration: "10 weeks",
    isPremium: true,
    price: "Ksh 9,999",
    image: courseMindset,
    rating: 4.8,
    category: "spiritual",
    pillarId: "personal-mastery",
    overview: "Engineer your life for maximum output and sustainability. This path teaches you to build personal operating systems — from morning routines to annual planning — that scale with your ambitions.",
    whatYouLearn: [
      "Personal systems design and optimization",
      "Energy management and peak performance cycles",
      "Time architecture and deep work protocols",
      "Decision frameworks for complex life choices",
      "Building systems that run without willpower",
      "IP basics, business structures, and market positioning",
    ],
    prerequisites: [
      "Completed: Mind Architecture & Identity Design",
      "Willingness to redesign daily routines",
    ],
    responsibleUse: [
      "Systems serve life — life doesn't serve systems",
      "Optimization without purpose is just busyness",
      "The goal is sustainability, not burnout",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Foundation", description: "Your performance identity", modules: ["The Systems Thinker — Identity Map", "Performance vs Productivity distinction"] },
      { id: "core", name: "Core Knowledge", description: "Performance science and systems theory", modules: ["Energy Management Science", "Deep Work & Flow State Theory", "Decision Architecture"] },
      { id: "applied", name: "Applied Skill", description: "Build your performance systems", modules: ["Morning Routine Engineering", "Weekly Review System Design", "Annual Planning Framework"] },
      { id: "tools", name: "Tool Mastery", description: "Productivity and tracking tools", modules: ["Digital Productivity Stack", "Personal Dashboard Design", "Entrepreneurial Intelligence Core"] },
      { id: "deploy", name: "Deployment & Monetization", description: "Consult and coach", modules: ["Performance Coaching Framework", "Capstone: Personal Operating System v2.0"] },
    ],
    progressionLevel: "practitioner",
    hasCapstone: true,
    entrepreneurialModule: true,
  },

  // ──────────── PILLAR 1 LEGACY: Personal Mastery (retained) ──────
  {
    id: "mindset-renewal",
    title: "Personal Mastery & Mind Renewal",
    description: "Transform your thinking patterns and unlock spiritual abundance through proven mindset renewal and cognitive discipline techniques.",
    duration: "8 weeks",
    isPremium: true,
    price: "Ksh 7,999",
    image: courseMindset,
    rating: 4.9,
    category: "spiritual",
    pillarId: "personal-mastery",
    overview: "Embark on a transformative journey combining mindset renewal, spiritual wealth principles, and personal leadership. This pillar course covers identity formation, purpose discovery, and building an abundance-conscious life.",
    whatYouLearn: [
      "Understanding spiritual laws of prosperity",
      "Techniques for breaking limiting beliefs",
      "Building a wealth-conscious mindset",
      "Daily practices for spiritual growth and discipline",
      "Aligning your purpose with prosperity",
      "Cognitive discipline: thinking clearly in a noisy world",
    ],
    prerequisites: [
      "Open mind and willingness to grow",
      "Commitment to daily practice",
      "Journal for reflection exercises",
    ],
    responsibleUse: [
      "Self-mastery is the foundation of all other mastery",
      "Technology aids growth — but discipline drives it",
      "Guard your attention as fiercely as your finances",
      "Wisdom is knowing what to ignore",
      "Character is built in silence, not in feeds",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Foundation", description: "Discover your purpose and core values", modules: ["Who Am I? — Identity mapping", "Breaking limiting beliefs workshop"] },
      { id: "core", name: "Core Knowledge", description: "Spiritual laws and abundance principles", modules: ["Laws of prosperity and stewardship", "The discipline of daily practice"] },
      { id: "applied", name: "Applied Skill", description: "Guided reflection exercises", modules: ["Journaling for transformation", "Decision frameworks for life choices"] },
      { id: "tools", name: "Tool Mastery", description: "Digital tools for personal growth", modules: ["Habit trackers and reflection apps", "Building accountability systems"] },
      { id: "deploy", name: "Deployment & Monetization", description: "Lead and mentor others", modules: ["Becoming a mindset coach", "Capstone: Personal Mastery Blueprint"] },
    ],
    progressionLevel: "foundation",
    hasCapstone: true,
    entrepreneurialModule: true,
  },

  // ──────────── PILLAR 2: Money Psychology & Wealth Thinking (Foundation) ──────
  {
    id: "money-psychology",
    title: "Money Psychology & Wealth Thinking",
    description: "The mandatory foundation course for Pillar 2. Rewire your relationship with money — identity, discipline, and financial frameworks — before choosing your specialization.",
    duration: "4 weeks",
    isPremium: false,
    image: courseFinance,
    rating: 4.9,
    category: "financial",
    pillarId: "financial-intelligence",
    overview: "This is your financial operating system. Before budgets, investments, or businesses — you must understand your money psychology. This course dismantles scarcity thinking, builds financial discipline, and prepares you for intelligent wealth creation.",
    whatYouLearn: [
      "Scarcity vs abundance mindset analysis",
      "Risk vs gambling — understanding the difference",
      "Financial discipline systems and daily practices",
      "Emotional triggers around money and spending",
      "Ethical wealth creation principles",
      "Risk appetite self-assessment",
      "30-day financial discipline challenge",
    ],
    prerequisites: [
      "Honest willingness to examine your money beliefs",
      "Journal or notebook for financial reflection",
      "30 minutes daily for 4 weeks",
    ],
    responsibleUse: [
      "Wealth is a tool for impact, not just accumulation",
      "High returns always carry high risk — there are no shortcuts",
      "Financial discipline requires emotional discipline",
      "Build wealth that serves your family and community",
      "Reject get-rich-fast thinking — pursue long-term value",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Reset", description: "Rewire your money identity", modules: ["Money Identity Mapping", "Scarcity vs Abundance Assessment", "Generational Financial Patterns"] },
      { id: "core", name: "Core Financial Knowledge", description: "Foundational financial literacy", modules: ["Risk vs Gambling Framework", "Time Value of Money", "Income, Savings, and Wealth Basics"] },
      { id: "applied", name: "Applied Personal Finance Skills", description: "Hands-on financial exercises", modules: ["Budget Builder Workshop", "Emotional Spending Triggers Lab", "30-Day Financial Discipline Challenge"] },
      { id: "tools", name: "Tool Mastery", description: "Financial tracking and planning tools", modules: ["Personal Finance Tracker Setup", "Risk Appetite Assessment Tool", "Financial Goal Setting Framework"] },
      { id: "deploy", name: "Deployment & Financial Blueprint", description: "Activate your financial foundation", modules: ["Personal Financial Blueprint", "Path Selection & Commitment"] },
    ],
    progressionLevel: "foundation",
    hasCapstone: false,
    entrepreneurialModule: false,
  },

  // ──────────── PILLAR 2: Personal Finance & Stability Architect ──────
  {
    id: "personal-finance-stability",
    title: "Personal Finance & Stability Architect",
    description: "Build bulletproof financial stability — budget systems, emergency funds, debt management, and savings automation for the Kenyan context.",
    duration: "10 weeks",
    isPremium: true,
    price: "Ksh 9,999",
    image: courseFinance,
    rating: 4.8,
    category: "financial",
    pillarId: "financial-intelligence",
    overview: "Design a complete personal financial stability system. From zero-based budgeting to insurance literacy and credit management in Kenya — this path makes you financially unbreakable.",
    whatYouLearn: [
      "Zero-based and envelope budgeting systems",
      "Emergency fund design and automation",
      "Debt management and elimination strategies",
      "Insurance literacy for Kenyan professionals",
      "Savings automation and M-Pesa integration",
      "Credit literacy and CRB awareness in Kenya",
      "Pitching, IP basics, and Kenyan business structures",
    ],
    prerequisites: [
      "Completed: Money Psychology & Wealth Thinking",
      "Willingness to track every shilling for 30 days",
    ],
    responsibleUse: [
      "Stability is the foundation of all wealth",
      "Budgets are not restrictions — they are freedom plans",
      "Insurance is preparation, not pessimism",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Foundation", description: "Your stability identity", modules: ["The Stability Architect — Identity Blueprint", "Financial peace vs financial anxiety"] },
      { id: "core", name: "Core Knowledge", description: "Budgeting, debt, and insurance", modules: ["Budgeting Systems Deep Dive", "Debt Psychology & Elimination", "Insurance & Risk Protection in Kenya"] },
      { id: "applied", name: "Applied Skill", description: "Build your stability systems", modules: ["Emergency Fund Calculator & Plan", "Debt Snowball/Avalanche Simulation", "Credit Score & CRB Workshop"] },
      { id: "tools", name: "Tool Mastery", description: "Financial tools and automation", modules: ["M-Pesa & Mobile Banking Optimization", "Savings Automation Setup", "Entrepreneurial Intelligence Core"] },
      { id: "deploy", name: "Deployment & Monetization", description: "Launch your stability blueprint", modules: ["Financial Coaching Framework", "Capstone: 12-Month Personal Financial Stability Blueprint"] },
    ],
    progressionLevel: "practitioner",
    hasCapstone: true,
    entrepreneurialModule: true,
  },

  // ──────────── PILLAR 2: Investor & Market Intelligence Builder ──────
  {
    id: "investor-market-intelligence",
    title: "Investor & Market Intelligence Builder",
    description: "Understand financial markets, build diversified portfolios, and develop data-driven investment thinking — without hype or gambling culture.",
    duration: "12 weeks",
    isPremium: true,
    price: "Ksh 12,999",
    image: courseForex,
    rating: 4.8,
    category: "financial",
    pillarId: "financial-intelligence",
    overview: "From the Nairobi Securities Exchange to global markets — learn to analyze, diversify, and build portfolios with discipline. This path reframes forex as 'Understanding Financial Markets & Risk Exposure' — no hype, no gambling.",
    whatYouLearn: [
      "Asset classes and investment vehicles",
      "NSE and global markets overview",
      "Portfolio diversification strategies",
      "Risk-adjusted return analysis",
      "Inflation, interest rates, and macro basics",
      "Understanding Financial Markets & Risk Exposure (Forex reframed)",
      "Pitching, pitch decks, and professional financial communication",
    ],
    prerequisites: [
      "Completed: Money Psychology & Wealth Thinking",
      "Basic mathematics and analytical thinking",
    ],
    responsibleUse: [
      "Investing is not gambling — discipline separates the two",
      "Diversify wisely; never invest what you cannot afford to lose",
      "Markets reward patience, not impulse",
      "Understand what you own and why you own it",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Foundation", description: "Your investor identity", modules: ["The Intelligent Investor — Identity Map", "Risk tolerance vs risk appetite"] },
      { id: "core", name: "Core Knowledge", description: "Markets, assets, and macro fundamentals", modules: ["Asset Classes & Investment Vehicles", "NSE & Global Markets Overview", "Inflation, Interest Rates & Macro"] },
      { id: "applied", name: "Applied Skill", description: "Portfolio building and analysis", modules: ["Portfolio Diversification Workshop", "Risk-Adjusted Return Calculator", "Financial Markets & Risk Exposure Sim"] },
      { id: "tools", name: "Tool Mastery", description: "Investment platforms and analysis", modules: ["Trading Platforms & Charting Tools", "Financial Statement Analysis", "Entrepreneurial Intelligence Core"] },
      { id: "deploy", name: "Deployment & Monetization", description: "Build and present your strategy", modules: ["Investment Advisory Framework", "Capstone: Simulated Diversified Portfolio with Risk Justification"] },
    ],
    progressionLevel: "practitioner",
    hasCapstone: true,
    entrepreneurialModule: true,
  },

  // ──────────── PILLAR 2: Income Systems & Digital Enterprise Architect ──────
  {
    id: "income-systems-enterprise",
    title: "Income Systems & Digital Enterprise Architect",
    description: "Design monetizable business models, revenue systems, and digital income streams — from unit economics to pricing psychology.",
    duration: "12 weeks",
    isPremium: true,
    price: "Ksh 11,999",
    image: courseFinance,
    rating: 4.9,
    category: "financial",
    pillarId: "financial-intelligence",
    overview: "Move beyond employment. This path teaches you to design business models, understand unit economics, manage cashflow, and build digital income streams. Think like an architect of wealth systems.",
    whatYouLearn: [
      "Business model design and validation",
      "Revenue systems and unit economics",
      "Cashflow management and forecasting",
      "Digital income stream architecture",
      "Pricing psychology and value perception",
      "IP fundamentals, taxation, and compliance in Kenya",
      "Professional financial communication and pitch decks",
    ],
    prerequisites: [
      "Completed: Money Psychology & Wealth Thinking",
      "Entrepreneurial drive and willingness to build",
    ],
    responsibleUse: [
      "Income systems should create value, not extract it",
      "Sustainable business beats quick profit every time",
      "Price for value delivered, not for maximum extraction",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Foundation", description: "Your enterprise identity", modules: ["The Enterprise Architect — Identity Map", "Employee mindset vs builder mindset"] },
      { id: "core", name: "Core Knowledge", description: "Business models and economics", modules: ["Business Model Design Framework", "Unit Economics & Revenue Systems", "Cashflow Management Fundamentals"] },
      { id: "applied", name: "Applied Skill", description: "Build your income system", modules: ["Digital Income Stream Workshop", "Pricing Psychology Lab", "Cashflow Forecasting Simulation"] },
      { id: "tools", name: "Tool Mastery", description: "Business and financial tools", modules: ["Financial Modeling Spreadsheets", "Digital Business Platforms", "Entrepreneurial Intelligence Core"] },
      { id: "deploy", name: "Deployment & Monetization", description: "Launch your enterprise", modules: ["Go-to-Market Strategy Design", "Capstone: Monetizable Income System Blueprint"] },
    ],
    progressionLevel: "practitioner",
    hasCapstone: true,
    entrepreneurialModule: true,
  },

  // ──────────── PILLAR 2 LEGACY: Financial Intelligence (retained) ──────
  {
    id: "financial-wisdom",
    title: "Financial Intelligence & Wealth Building",
    description: "Master financial literacy, budgeting, investing, and income systems for long-term wealth creation in Kenya.",
    duration: "10 weeks",
    isPremium: true,
    price: "Ksh 9,999",
    image: courseFinance,
    rating: 4.8,
    category: "financial",
    pillarId: "financial-intelligence",
    overview: "A comprehensive financial mastery program combining budgeting, investment strategy, forex fundamentals, and multiple income stream development — tailored for Kenyan professionals and entrepreneurs.",
    whatYouLearn: [
      "Personal budgeting and money management",
      "Investment fundamentals and strategies",
      "Forex trading fundamentals and risk management",
      "Asset acquisition and portfolio building",
      "Creating multiple income streams",
      "Tax optimization and estate planning in Kenya",
    ],
    prerequisites: [
      "Basic mathematics skills",
      "Willingness to track personal finances",
      "Computer or smartphone for exercises",
    ],
    responsibleUse: [
      "Wealth is a tool for impact, not just accumulation",
      "High returns always carry high risk — there are no shortcuts",
      "Financial discipline requires emotional discipline",
      "Diversify wisely; never invest what you cannot afford to lose",
      "Build wealth that serves your family and community",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Foundation", description: "Your financial identity and money beliefs", modules: ["Money mindset assessment", "Breaking generational financial patterns"] },
      { id: "core", name: "Core Knowledge", description: "Budgeting, investing, and forex fundamentals", modules: ["Personal finance foundations", "Investment vehicles in Kenya", "Forex market fundamentals"] },
      { id: "applied", name: "Applied Skill", description: "Hands-on financial simulations", modules: ["Budget builder simulation", "Trading practice with demo accounts", "Portfolio construction exercise"] },
      { id: "tools", name: "Tool Mastery", description: "Financial tools and platforms", modules: ["M-Pesa business tools", "Trading platforms and charting", "Financial spreadsheet mastery"] },
      { id: "deploy", name: "Deployment & Monetization", description: "Launch your financial strategy", modules: ["Building your investment plan", "Capstone: Personal Wealth Blueprint"] },
    ],
    progressionLevel: "foundation",
    hasCapstone: true,
    entrepreneurialModule: true,
  },

  // ──────────── PILLAR 3: Digital Literacy & Productivity Systems ──
  {
    id: "digital-literacy",
    title: "Digital Literacy & Productivity Systems",
    description: "Build essential digital fluency, master productivity tools, and develop AI literacy while maintaining cognitive independence.",
    duration: "8 weeks",
    isPremium: true,
    price: "Ksh 8,999",
    image: courseIct,
    rating: 4.7,
    category: "ict",
    pillarId: "digital-literacy",
    subcategory: "Digital Skills for the Modern Economy",
    overview: "From digital fluency basics to AI literacy, data interpretation, and workflow automation — this pillar builds the complete digital professional. Learn to leverage modern tools while maintaining sharp, independent thinking.",
    whatYouLearn: [
      "Digital tools and productivity software mastery",
      "AI literacy and critical evaluation of AI outputs",
      "Data literacy and informed decision-making",
      "Workflow automation with no-code tools",
      "Professional digital communication",
      "Maintaining focus and cognitive discipline online",
    ],
    prerequisites: [
      "Basic computer literacy",
      "Internet access",
      "Curiosity about technology",
    ],
    responsibleUse: [
      "AI tools amplify your thinking — they don't replace it",
      "Productivity tools serve you, not the other way around",
      "Data informs decisions — it doesn't make them for you",
      "Automate the mechanical, not the meaningful",
      "Protect time for thinking without digital input",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Foundation", description: "Your digital identity and tech mindset", modules: ["Digital confidence assessment", "Tech mindset vs tech dependency"] },
      { id: "core", name: "Core Knowledge", description: "Digital fluency, AI, and data literacy", modules: ["Digital tools fundamentals", "AI literacy and critical thinking", "Data literacy essentials"] },
      { id: "applied", name: "Applied Skill", description: "Hands-on tool practice", modules: ["Productivity system setup", "AI prompt engineering workshop", "Data analysis with spreadsheets"] },
      { id: "tools", name: "Tool Mastery", description: "Modern productivity stack", modules: ["Automation with Zapier/Make", "Professional communication tools", "Digital workspace optimization"] },
      { id: "deploy", name: "Deployment & Monetization", description: "Digital professional presence", modules: ["Building your digital brand", "Capstone: Digital Transformation Plan"] },
    ],
    progressionLevel: "foundation",
    hasCapstone: true,
    entrepreneurialModule: true,
  },

  // ──────────── PILLAR 4: Cybersecurity & Digital Protection ──
  {
    id: "cybersecurity",
    title: "Cybersecurity & Digital Protection",
    description: "Protect digital assets, understand threat landscapes, and build security-first thinking for personal and organizational safety.",
    duration: "10 weeks",
    isPremium: true,
    price: "Ksh 10,999",
    image: courseCybersecurity,
    rating: 4.7,
    category: "ict",
    pillarId: "cybersecurity",
    overview: "From personal digital safety to organizational security and cloud protection — this pillar covers the full spectrum of cybersecurity. Includes hands-on labs, threat simulations, and IoT security fundamentals.",
    whatYouLearn: [
      "Threat landscape and attack vectors",
      "Network security and encryption fundamentals",
      "Cloud security and compliance",
      "IoT device security essentials",
      "Incident response and recovery",
      "Security best practices for individuals and organizations",
    ],
    prerequisites: [
      "Basic networking knowledge",
      "Computer literacy",
      "Logical thinking ability",
    ],
    responsibleUse: [
      "Security knowledge is for protection, never exploitation",
      "Privacy is a fundamental right — defend it responsibly",
      "The best security is built on awareness, not paranoia",
      "Share security knowledge to protect your community",
      "Ethics must guide every technical capability you develop",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Foundation", description: "Security-first thinking", modules: ["The security mindset", "Ethical foundations of cybersecurity"] },
      { id: "core", name: "Core Knowledge", description: "Threats, networks, and defense", modules: ["Network security fundamentals", "Encryption and authentication", "Cloud security and compliance"] },
      { id: "applied", name: "Applied Skill", description: "Hands-on security labs", modules: ["Phishing detection simulation", "Vulnerability assessment exercise", "IoT security lab"] },
      { id: "tools", name: "Tool Mastery", description: "Security tools and platforms", modules: ["Security scanning tools", "Firewall and VPN configuration", "Monitoring and alerting systems"] },
      { id: "deploy", name: "Deployment & Monetization", description: "Security consulting and careers", modules: ["Building a security practice", "Capstone: Security Audit Report"] },
    ],
    progressionLevel: "foundation",
    hasCapstone: true,
    entrepreneurialModule: true,
  },

  // ──────────── PILLAR 5: Programming & Intelligent Systems ──
  {
    id: "programming-systems",
    title: "Programming & Intelligent Systems",
    description: "Master Python, data science, AI/ML, and IoT — building practical intelligent systems from code to deployment.",
    duration: "14 weeks",
    isPremium: true,
    price: "Ksh 14,999",
    image: coursePython,
    rating: 4.9,
    category: "ict",
    pillarId: "programming-systems",
    overview: "A comprehensive programming pillar that takes you from Python fundamentals through data science, machine learning, and IoT — with real-world projects at every stage. Build intelligent systems that solve African problems.",
    whatYouLearn: [
      "Python programming from basics to advanced",
      "Data science and statistical analysis",
      "Machine learning model building and evaluation",
      "IoT device programming and connected systems",
      "API development and database integration",
      "Deploying intelligent applications",
    ],
    prerequisites: [
      "Basic computer skills",
      "Mathematics fundamentals (algebra)",
      "Problem-solving mindset",
    ],
    responsibleUse: [
      "Code is a tool — your judgment determines its impact",
      "AI must serve human welfare, not replace human thought",
      "Build systems that are transparent and explainable",
      "Consider who benefits and who might be harmed by your code",
      "The best programmers think about people, not just machines",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Foundation", description: "The developer mindset", modules: ["Thinking like a programmer", "Problem decomposition and logic"] },
      { id: "core", name: "Core Knowledge", description: "Python, data, and AI fundamentals", modules: ["Python programming mastery", "Data science foundations", "AI and ML fundamentals"] },
      { id: "applied", name: "Applied Skill", description: "Build real projects", modules: ["Data analysis projects", "ML model training lab", "IoT sensor project"] },
      { id: "tools", name: "Tool Mastery", description: "Developer tools and frameworks", modules: ["Django/Flask web development", "Jupyter and data tools", "IoT platforms and sensors"] },
      { id: "deploy", name: "Deployment & Monetization", description: "Ship and monetize your code", modules: ["Deploying applications to production", "Capstone: Intelligent System Prototype"] },
    ],
    progressionLevel: "foundation",
    hasCapstone: true,
    entrepreneurialModule: true,
  },

  // ──────────── PILLAR 6: Creator Economy & Digital Monetization ──
  {
    id: "creator-economy",
    title: "Creator Economy & Digital Monetization",
    description: "Build, grow, and monetize your digital presence through content creation, YouTube, eBooks, and online business systems.",
    duration: "10 weeks",
    isPremium: true,
    price: "Ksh 11,999",
    image: courseContent,
    rating: 4.8,
    category: "income",
    pillarId: "creator-economy",
    overview: "Master the creator economy — from professional copywriting and eBook publishing to YouTube channel growth and automation. Build sustainable online income with authenticity and strategic thinking.",
    whatYouLearn: [
      "Professional copywriting and content strategy",
      "eBook creation, formatting, and publishing",
      "YouTube channel optimization and branding",
      "Video content strategy and SEO for growth",
      "Monetization beyond AdSense — sponsorships, courses, products",
      "Automation tools for content workflows",
    ],
    prerequisites: [
      "Good command of written language",
      "Creative thinking ability",
      "Computer or smartphone with internet access",
    ],
    responsibleUse: [
      "Authenticity builds lasting audience relationships",
      "Engagement should add value, not just chase metrics",
      "Quality content outperforms volume every time",
      "Your digital presence reflects your real values",
      "Build a brand you'd be proud to explain to your grandchildren",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Foundation", description: "Your creator identity", modules: ["Finding your creator voice", "The discipline of consistent creation"] },
      { id: "core", name: "Core Knowledge", description: "Content, publishing, and video", modules: ["Copywriting and storytelling", "eBook creation and publishing", "YouTube fundamentals and strategy"] },
      { id: "applied", name: "Applied Skill", description: "Create and publish real content", modules: ["Write and publish your first eBook", "Launch and optimize a YouTube channel", "Content calendar and batch production"] },
      { id: "tools", name: "Tool Mastery", description: "Creator tools and automation", modules: ["Video editing and production tools", "SEO and analytics mastery", "Automation and scheduling systems"] },
      { id: "deploy", name: "Deployment & Monetization", description: "Monetize your content empire", modules: ["Multi-platform monetization strategy", "Capstone: Creator Business Plan"] },
    ],
    progressionLevel: "foundation",
    hasCapstone: true,
    entrepreneurialModule: true,
  },

  // ──────────── PILLAR 7: Civic Leadership & Governance ──
  {
    id: "civic-leadership",
    title: "Civic Leadership & Governance",
    description: "Develop leadership skills for community impact, public service, and responsible governance in the digital age.",
    duration: "8 weeks",
    isPremium: true,
    price: "Ksh 7,999",
    image: courseCivicLeadership,
    rating: 4.7,
    category: "civic",
    pillarId: "civic-leadership",
    overview: "Equip yourself for meaningful civic participation and community leadership. This pillar covers public policy literacy, ethical governance, community organizing, and using digital tools for civic engagement — all grounded in Kenyan context.",
    whatYouLearn: [
      "Public policy literacy and the Kenyan constitution",
      "Community organizing and stakeholder engagement",
      "Ethical leadership and governance principles",
      "Digital tools for civic engagement and transparency",
      "Public speaking and advocacy communication",
      "Project management for community development",
    ],
    prerequisites: [
      "Interest in public service and community impact",
      "Basic understanding of Kenyan governance structures",
      "Commitment to ethical leadership",
    ],
    responsibleUse: [
      "Leadership is service, not self-promotion",
      "Digital tools amplify your voice — use it wisely",
      "Governance requires transparency and accountability",
      "Civic engagement is a responsibility, not a trend",
      "Build institutions, not just influence",
    ],
    layers: [
      { id: "identity", name: "Identity & Mindset Foundation", description: "The leader within", modules: ["Your leadership identity", "Values-driven decision making"] },
      { id: "core", name: "Core Knowledge", description: "Governance, policy, and civic literacy", modules: ["The Kenyan constitution and governance", "Public policy analysis", "Ethics in public service"] },
      { id: "applied", name: "Applied Skill", description: "Civic engagement in practice", modules: ["Community needs assessment", "Stakeholder engagement simulation", "Public speaking workshop"] },
      { id: "tools", name: "Tool Mastery", description: "Digital tools for governance", modules: ["Open data and transparency platforms", "Digital advocacy and campaign tools", "Project management for development"] },
      { id: "deploy", name: "Deployment & Monetization", description: "Lead and serve", modules: ["Launching a community initiative", "Capstone: Civic Impact Project"] },
    ],
    progressionLevel: "foundation",
    hasCapstone: true,
    entrepreneurialModule: true,
  },
];

// ═══════════════════════════════════════════════════════════════
// PILLARS — 7 Core Pillars with Learning Paths
// ═══════════════════════════════════════════════════════════════

export const pillars: Pillar[] = [
  {
    id: "personal-mastery",
    name: "Personal Mastery & Mind Renewal",
    tagline: "Your internal operating system",
    icon: "brain",
    color: "#7C5CBF",
    description: "Build your cognitive operating system — identity, discipline, and mental frameworks that power everything else you do.",
    focusAreas: ["Identity design", "Cognitive discipline", "Habit architecture", "Leadership psychology", "High-performance systems"],
    whoIsItFor: "Anyone who wants to master themselves before mastering their career. Students, professionals, and aspiring leaders who understand that external success begins with internal architecture.",
    coreCompetencies: ["Self-awareness & identity mapping", "Behavioral design & habit formation", "Ethical decision-making", "Leadership & influence", "Personal systems optimization"],
    courseIds: ["mind-architecture", "identity-discipline", "leadership-psychology", "performance-architect", "mindset-renewal"],
    learningPaths: [
      {
        id: "mind-architecture-foundation",
        title: "Mind Architecture & Identity Design",
        description: "Mandatory foundation — build your cognitive operating system before choosing a specialization",
        targetRole: "Self-Mastery Practitioner",
        skillLevel: "beginner",
        estimatedWeeks: 4,
        courseIds: ["mind-architecture"],
        careerOutcomes: ["Personal development coach", "Mindset consultant", "Self-leadership practitioner"],
        competencyMilestones: ["Identity mapping complete", "Cognitive discipline protocol active", "Psychological profile generated"],
        requiredFoundation: "None — this IS the foundation",
        certificationTier: "Foundation",
      },
      {
        id: "identity-discipline-builder",
        title: "Identity & Discipline Builder",
        description: "Deep inner work — master habits, self-regulation, and personal integrity",
        targetRole: "Discipline Coach",
        skillLevel: "intermediate",
        estimatedWeeks: 10,
        courseIds: ["mind-architecture", "identity-discipline"],
        capstoneProject: "Personal Transformation Portfolio — 90-day habit challenge results and coaching framework",
        careerOutcomes: ["Discipline coach", "Habit design consultant", "Personal accountability partner"],
        competencyMilestones: ["90-day habit challenge complete", "Accountability system built", "Coaching framework designed"],
        requiredFoundation: "Mind Architecture & Identity Design",
        certificationTier: "Practitioner",
        comparisonData: { technicalDepth: "Low", codingIntensity: "None", infrastructureExposure: "Personal systems", careerEnvironment: "Coaching & consulting", difficultyLevel: "Intermediate", duration: "10 weeks" },
      },
      {
        id: "leadership-psychology",
        title: "Leadership Psychology & Influence",
        description: "Master the psychology of leadership, persuasion, and ethical influence",
        targetRole: "Leadership Consultant",
        skillLevel: "intermediate",
        estimatedWeeks: 12,
        courseIds: ["mind-architecture", "leadership-psychology"],
        capstoneProject: "Community Leadership Project — design and lead a real initiative",
        careerOutcomes: ["Leadership consultant", "Team development specialist", "Public speaking coach"],
        competencyMilestones: ["Influence psychology mastered", "Conflict resolution certified", "Public speaking intensive complete"],
        requiredFoundation: "Mind Architecture & Identity Design",
        certificationTier: "Practitioner",
        comparisonData: { technicalDepth: "Medium", codingIntensity: "None", infrastructureExposure: "Organizational", careerEnvironment: "Corporate & community leadership", difficultyLevel: "Intermediate", duration: "12 weeks" },
      },
      {
        id: "high-performance-architect",
        title: "High-Performance Systems Architect",
        description: "Design personal systems for peak performance and scalable productivity",
        targetRole: "Performance Coach",
        skillLevel: "advanced",
        estimatedWeeks: 10,
        courseIds: ["mind-architecture", "performance-architect"],
        capstoneProject: "Personal Operating System v2.0 — complete life system design",
        careerOutcomes: ["Performance coach", "Productivity consultant", "Systems designer"],
        competencyMilestones: ["Energy management system active", "Deep work protocol implemented", "Annual planning framework built"],
        requiredFoundation: "Mind Architecture & Identity Design",
        certificationTier: "Specialist",
        comparisonData: { technicalDepth: "High", codingIntensity: "Low", infrastructureExposure: "Digital productivity tools", careerEnvironment: "Consulting & executive coaching", difficultyLevel: "Advanced", duration: "10 weeks" },
      },
    ],
  },
  {
    id: "financial-intelligence",
    name: "Financial Intelligence & Income Systems",
    tagline: "Build wealth that serves purpose",
    icon: "trending-up",
    color: "#C9A84C",
    description: "Rewire your relationship with money and build intelligent wealth systems — from personal budgets to investment portfolios and digital enterprises.",
    focusAreas: ["Money psychology", "Personal finance", "Investment literacy", "Business model design", "Income systems"],
    whoIsItFor: "Professionals, entrepreneurs, and young adults who want to build financial stability, understand markets, or design income-generating systems — without falling for get-rich-fast schemes.",
    coreCompetencies: ["Financial discipline & budgeting", "Investment analysis", "Risk management", "Business model design", "Revenue system architecture"],
    courseIds: ["money-psychology", "personal-finance-stability", "investor-market-intelligence", "income-systems-enterprise", "financial-wisdom"],
    learningPaths: [
      {
        id: "money-psychology-foundation",
        title: "Money Psychology & Wealth Thinking",
        description: "Mandatory foundation — rewire your financial operating system before choosing a specialization",
        targetRole: "Financially Literate Individual",
        skillLevel: "beginner",
        estimatedWeeks: 4,
        courseIds: ["money-psychology"],
        careerOutcomes: ["Financially disciplined individual", "Personal finance educator"],
        competencyMilestones: ["Money identity mapped", "Risk appetite assessed", "30-day discipline challenge complete"],
        requiredFoundation: "None — this IS the foundation",
        certificationTier: "Foundation",
      },
      {
        id: "personal-finance-stability",
        title: "Personal Finance & Stability Architect",
        description: "Build bulletproof financial stability — budgets, emergency funds, debt management, and savings automation",
        targetRole: "Financial Stability Coach",
        skillLevel: "intermediate",
        estimatedWeeks: 10,
        courseIds: ["money-psychology", "personal-finance-stability"],
        capstoneProject: "12-Month Personal Financial Stability Blueprint",
        careerOutcomes: ["Financial coach", "Budget consultant", "Insurance advisor"],
        competencyMilestones: ["Budget system operational", "Emergency fund designed", "Debt elimination plan active"],
        requiredFoundation: "Money Psychology & Wealth Thinking",
        certificationTier: "Practitioner",
        comparisonData: { technicalDepth: "Medium", codingIntensity: "Low", infrastructureExposure: "Banking & M-Pesa", careerEnvironment: "Personal finance coaching", difficultyLevel: "Intermediate", duration: "10 weeks" },
      },
      {
        id: "investor-market-intelligence",
        title: "Investor & Market Intelligence Builder",
        description: "Understand financial markets, build diversified portfolios, and develop data-driven investment thinking",
        targetRole: "Investment Analyst",
        skillLevel: "intermediate",
        estimatedWeeks: 12,
        courseIds: ["money-psychology", "investor-market-intelligence"],
        capstoneProject: "Simulated diversified portfolio strategy with risk justification",
        careerOutcomes: ["Investment analyst", "Portfolio advisor", "Market researcher"],
        competencyMilestones: ["Asset classes mastered", "Portfolio simulation complete", "Macro analysis framework built"],
        requiredFoundation: "Money Psychology & Wealth Thinking",
        certificationTier: "Specialist",
        comparisonData: { technicalDepth: "High", codingIntensity: "Medium", infrastructureExposure: "NSE & global markets", careerEnvironment: "Finance & investment firms", difficultyLevel: "Intermediate", duration: "12 weeks" },
      },
      {
        id: "income-systems-enterprise",
        title: "Income Systems & Digital Enterprise Architect",
        description: "Design business models, revenue systems, and digital income streams from zero to launch",
        targetRole: "Digital Enterprise Architect",
        skillLevel: "advanced",
        estimatedWeeks: 12,
        courseIds: ["money-psychology", "income-systems-enterprise"],
        capstoneProject: "Monetizable income system blueprint with business model and go-to-market plan",
        careerOutcomes: ["Digital entrepreneur", "Business strategist", "Revenue systems designer"],
        competencyMilestones: ["Business model designed", "Unit economics calculated", "Go-to-market plan complete"],
        requiredFoundation: "Money Psychology & Wealth Thinking",
        certificationTier: "Elite",
        comparisonData: { technicalDepth: "High", codingIntensity: "Medium", infrastructureExposure: "Digital platforms", careerEnvironment: "Entrepreneurship & startups", difficultyLevel: "Advanced", duration: "12 weeks" },
      },
    ],
    units: [
      {
        id: "financial-markets-trading",
        title: "Financial Markets & Trading Foundations",
        description: "Understand how financial markets work, develop trading literacy, and learn capital preservation — without gambling culture or get-rich-fast hype.",
        icon: "trending-up",
        learningPaths: [
          {
            id: "financial-markets-literacy",
            title: "Financial Markets Literacy",
            description: "Foundation track — understand market structure, trading mechanics, risk basics, and trading psychology",
            targetRole: "Financially Literate Market Participant",
            skillLevel: "beginner",
            estimatedWeeks: 6,
            courseIds: ["money-psychology"],
            careerOutcomes: ["Informed investor", "Financial literacy educator", "Market-aware professional"],
            competencyMilestones: ["Market structure understood", "Trading mechanics mastered", "Risk fundamentals assessed"],
            requiredFoundation: "Money Psychology & Wealth Thinking",
            certificationTier: "Foundation",
            comparisonData: { technicalDepth: "Low", codingIntensity: "None", infrastructureExposure: "Market data platforms", careerEnvironment: "Personal finance & education", difficultyLevel: "Beginner", duration: "6 weeks" },
          },
          {
            id: "retail-trading-analyst",
            title: "Retail Trading Analyst Track",
            description: "Premium track — technical analysis foundations, risk management, strategy frameworks, backtesting, and demo trading",
            targetRole: "Retail Trading Analyst",
            skillLevel: "intermediate",
            estimatedWeeks: 14,
            courseIds: ["money-psychology", "investor-market-intelligence"],
            capstoneProject: "Backtested trading strategy with risk parameters and 30-day demo trading journal",
            careerOutcomes: ["Retail trading analyst", "Market research assistant", "Risk-aware independent trader"],
            competencyMilestones: ["Technical analysis foundations complete", "Risk management framework built", "Strategy backtested", "Demo trading requirement met"],
            requiredFoundation: "Financial Markets Literacy",
            certificationTier: "Specialist",
            comparisonData: { technicalDepth: "High", codingIntensity: "Low", infrastructureExposure: "Trading platforms & charting tools", careerEnvironment: "Financial analysis & independent trading", difficultyLevel: "Intermediate", duration: "14 weeks" },
          },
          {
            id: "capital-preservation-risk",
            title: "Capital Preservation & Risk Specialist Track",
            description: "Master position sizing, drawdown management, portfolio hedging, and risk modeling fundamentals",
            targetRole: "Risk Management Specialist",
            skillLevel: "advanced",
            estimatedWeeks: 12,
            courseIds: ["money-psychology", "investor-market-intelligence"],
            capstoneProject: "Comprehensive risk management framework with position sizing model and hedging strategy",
            careerOutcomes: ["Risk management specialist", "Portfolio risk analyst", "Capital preservation advisor"],
            competencyMilestones: ["Position sizing mastery achieved", "Drawdown management plan active", "Hedging concepts applied", "Risk model built"],
            requiredFoundation: "Financial Markets Literacy",
            certificationTier: "Elite",
            comparisonData: { technicalDepth: "Very High", codingIntensity: "Medium", infrastructureExposure: "Risk platforms & modeling tools", careerEnvironment: "Risk management & advisory", difficultyLevel: "Advanced", duration: "12 weeks" },
          },
        ],
      },
    ],
  },
  {
    id: "digital-literacy",
    name: "Digital Literacy & Productivity Systems",
    tagline: "Master tools without losing your mind",
    icon: "monitor",
    color: "#3B82F6",
    description: "Build essential digital fluency, master productivity tools, and develop AI literacy while maintaining cognitive independence.",
    focusAreas: ["Digital tools mastery", "AI literacy", "Workflow automation", "Data interpretation", "Professional communication"],
    whoIsItFor: "Professionals, students, and business owners who need to work efficiently with modern digital tools, understand AI, and automate repetitive workflows.",
    coreCompetencies: ["Digital tool proficiency", "AI prompt engineering", "Data analysis basics", "Workflow automation", "Digital communication"],
    courseIds: ["digital-literacy"],
    learningPaths: [
      {
        id: "digital-productivity-specialist",
        title: "Digital Productivity Specialist Path",
        description: "Master digital tools, workflows, and systems to become the most efficient professional in any organization",
        targetRole: "Digital Productivity Specialist",
        skillLevel: "beginner",
        estimatedWeeks: 10,
        courseIds: ["digital-literacy"],
        capstoneProject: "Complete Digital Productivity System Blueprint for a real organization",
        careerOutcomes: ["Digital productivity consultant", "Office systems manager", "Workflow optimization specialist"],
        competencyMilestones: ["Core tools mastered", "Workflow system designed", "Productivity blueprint deployed"],
        requiredFoundation: "Digital Literacy & Productivity Foundation",
        certificationTier: "Practitioner",
        comparisonData: { technicalDepth: "Medium", codingIntensity: "None", infrastructureExposure: "Office & cloud tools", careerEnvironment: "Any modern workplace", difficultyLevel: "Beginner", duration: "10 weeks" },
      },
      {
        id: "remote-work-operations",
        title: "Remote Work & Virtual Operations Path",
        description: "Build expertise in remote collaboration, virtual team management, and distributed operations",
        targetRole: "Remote Operations Manager",
        skillLevel: "intermediate",
        estimatedWeeks: 10,
        courseIds: ["digital-literacy"],
        capstoneProject: "Remote Operations Playbook for a distributed team or organization",
        careerOutcomes: ["Remote operations manager", "Virtual team lead", "Distributed work consultant"],
        competencyMilestones: ["Virtual collaboration tools mastered", "Remote team workflow designed", "Operations playbook complete"],
        requiredFoundation: "Digital Literacy & Productivity Foundation",
        certificationTier: "Practitioner",
        comparisonData: { technicalDepth: "Medium", codingIntensity: "Low", infrastructureExposure: "Collaboration platforms", careerEnvironment: "Remote & hybrid organizations", difficultyLevel: "Intermediate", duration: "10 weeks" },
      },
      {
        id: "digital-research-intelligence",
        title: "Digital Research & Information Intelligence Path",
        description: "Master digital research methods, information verification, data interpretation, and evidence-based decision making",
        targetRole: "Digital Research Analyst",
        skillLevel: "intermediate",
        estimatedWeeks: 12,
        courseIds: ["digital-literacy"],
        capstoneProject: "Comprehensive Digital Research Report with verified sources and data visualization",
        careerOutcomes: ["Digital research analyst", "Information specialist", "Fact-checking consultant"],
        competencyMilestones: ["Research methodology mastered", "Information verification skills certified", "Data interpretation framework built"],
        requiredFoundation: "Digital Literacy & Productivity Foundation",
        certificationTier: "Specialist",
        comparisonData: { technicalDepth: "High", codingIntensity: "Low", infrastructureExposure: "Research & data platforms", careerEnvironment: "Research, media & consulting", difficultyLevel: "Intermediate", duration: "12 weeks" },
      },
      {
        id: "digital-tools-entrepreneurs",
        title: "Digital Tools for Entrepreneurs Path",
        description: "Leverage digital tools to launch, manage, and scale a business — from marketing automation to financial tracking",
        targetRole: "Digitally-Enabled Entrepreneur",
        skillLevel: "intermediate",
        estimatedWeeks: 12,
        courseIds: ["digital-literacy"],
        capstoneProject: "Digital Business Operations Blueprint with integrated tool stack",
        careerOutcomes: ["Digitally-savvy entrepreneur", "Business automation consultant", "Startup operations lead"],
        competencyMilestones: ["Business tool stack configured", "Marketing automation live", "Digital operations blueprint complete"],
        requiredFoundation: "Digital Literacy & Productivity Foundation",
        certificationTier: "Specialist",
        comparisonData: { technicalDepth: "Medium", codingIntensity: "Low", infrastructureExposure: "Business & marketing platforms", careerEnvironment: "Entrepreneurship & startups", difficultyLevel: "Intermediate", duration: "12 weeks" },
      },
    ],
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity & Digital Protection",
    tagline: "Defend the digital frontier",
    icon: "shield",
    color: "#0E7A8A",
    description: "Protect digital assets, understand threat landscapes, and build security-first thinking for personal and organizational safety.",
    focusAreas: ["Threat detection", "Network security", "Ethical hacking", "Cloud security", "Digital forensics"],
    whoIsItFor: "Tech enthusiasts, IT professionals, and anyone passionate about protecting digital infrastructure — from personal devices to enterprise networks.",
    coreCompetencies: ["Threat analysis & detection", "Network & cloud security", "Vulnerability assessment", "Incident response", "Security policy design"],
    courseIds: ["cybersecurity"],
    learningPaths: [
      {
        id: "cybersecurity-analyst",
        title: "Cybersecurity Analyst",
        description: "Monitor, detect, and respond to security threats in organizations",
        targetRole: "Cybersecurity Analyst",
        skillLevel: "beginner",
        estimatedWeeks: 10,
        courseIds: ["cybersecurity"],
        capstoneProject: "Complete security audit report for a simulated organization",
        careerOutcomes: ["SOC analyst", "Security operations specialist", "IT security officer"],
        competencyMilestones: ["Threat landscape mapped", "SIEM tools mastered", "Incident response plan created"],
        certificationTier: "Practitioner",
        comparisonData: { technicalDepth: "Medium", codingIntensity: "Low", infrastructureExposure: "Enterprise networks", careerEnvironment: "SOC & IT departments", difficultyLevel: "Beginner", duration: "10 weeks" },
      },
      {
        id: "ethical-hacker",
        title: "Red Team & Ethical Hacking",
        description: "Learn penetration testing and vulnerability assessment ethically",
        targetRole: "Ethical Hacker / Pen Tester",
        skillLevel: "advanced",
        estimatedWeeks: 14,
        courseIds: ["cybersecurity"],
        capstoneProject: "Penetration test report with remediation recommendations",
        careerOutcomes: ["Penetration tester", "Red team operator", "Security researcher"],
        competencyMilestones: ["Recon & enumeration complete", "Exploitation techniques mastered", "Report writing certified"],
        certificationTier: "Elite",
        comparisonData: { technicalDepth: "Very High", codingIntensity: "High", infrastructureExposure: "Full-stack offensive", careerEnvironment: "Security firms & bug bounty", difficultyLevel: "Advanced", duration: "14 weeks" },
      },
      {
        id: "digital-safety-advocate",
        title: "Digital Safety Advocate",
        description: "Protect communities from online threats and promote digital wellness",
        targetRole: "Digital Safety Educator",
        skillLevel: "beginner",
        estimatedWeeks: 8,
        courseIds: ["cybersecurity"],
        capstoneProject: "Community digital safety workshop curriculum",
        careerOutcomes: ["Digital safety trainer", "Community cyber educator", "School ICT safety coordinator"],
        competencyMilestones: ["Threat awareness curriculum built", "Workshop facilitated", "Community safety guide published"],
        certificationTier: "Practitioner",
        comparisonData: { technicalDepth: "Low", codingIntensity: "None", infrastructureExposure: "Consumer devices", careerEnvironment: "Education & community", difficultyLevel: "Beginner", duration: "8 weeks" },
      },
    ],
  },
  {
    id: "programming-systems",
    name: "Programming & Intelligent Systems",
    tagline: "Build solutions that think",
    icon: "code",
    color: "#2F855A",
    description: "Master Python, data science, AI/ML, and IoT — building practical intelligent systems from code to deployment.",
    focusAreas: ["Python programming", "Data science", "Machine learning", "IoT systems", "Web development"],
    whoIsItFor: "Aspiring developers, data scientists, and tech innovators who want to build real solutions — from web apps to intelligent IoT systems — that solve African problems.",
    coreCompetencies: ["Python programming", "Data analysis & visualization", "ML model building", "API development", "System deployment"],
    courseIds: ["programming-systems"],
    learningPaths: [
      {
        id: "software-developer",
        title: "Software Developer",
        description: "Master Python and web development for professional software engineering",
        targetRole: "Software Developer",
        skillLevel: "beginner",
        estimatedWeeks: 14,
        courseIds: ["programming-systems"],
        capstoneProject: "Full-stack web application solving a real Kenyan problem",
        careerOutcomes: ["Junior software developer", "Web developer", "Freelance programmer"],
        competencyMilestones: ["Python fundamentals mastered", "Web app deployed", "API integration complete"],
        certificationTier: "Practitioner",
        comparisonData: { technicalDepth: "High", codingIntensity: "Very High", infrastructureExposure: "Web & cloud", careerEnvironment: "Tech companies & freelance", difficultyLevel: "Beginner", duration: "14 weeks" },
      },
      {
        id: "data-scientist",
        title: "Data Scientist",
        description: "Analyze data, build models, and extract actionable insights",
        targetRole: "Data Scientist",
        skillLevel: "intermediate",
        estimatedWeeks: 16,
        courseIds: ["programming-systems"],
        capstoneProject: "End-to-end data science project with Kenya-relevant dataset",
        careerOutcomes: ["Data analyst", "Data scientist", "BI specialist"],
        competencyMilestones: ["Statistical analysis complete", "ML model trained", "Dashboard published"],
        certificationTier: "Specialist",
        comparisonData: { technicalDepth: "Very High", codingIntensity: "High", infrastructureExposure: "Data platforms & cloud", careerEnvironment: "Analytics & research", difficultyLevel: "Intermediate", duration: "16 weeks" },
      },
      {
        id: "ai-engineer",
        title: "AI & IoT Engineer",
        description: "Build intelligent and connected systems using AI and IoT",
        targetRole: "AI / IoT Engineer",
        skillLevel: "advanced",
        estimatedWeeks: 18,
        courseIds: ["programming-systems"],
        capstoneProject: "Intelligent IoT system prototype with ML integration",
        careerOutcomes: ["AI engineer", "IoT developer", "Embedded systems specialist"],
        competencyMilestones: ["ML pipeline built", "IoT prototype operational", "Edge deployment complete"],
        certificationTier: "Elite",
        comparisonData: { technicalDepth: "Very High", codingIntensity: "Very High", infrastructureExposure: "Hardware & cloud", careerEnvironment: "R&D & innovation labs", difficultyLevel: "Advanced", duration: "18 weeks" },
      },
    ],
  },
  {
    id: "creator-economy",
    name: "Creator Economy & Digital Monetisation",
    tagline: "Create value, build legacy",
    icon: "video",
    color: "#E0607E",
    description: "Build, grow, and monetize your digital presence through content creation, YouTube, eBooks, and online business systems.",
    focusAreas: ["Content strategy", "eBook publishing", "YouTube growth", "Digital business models", "Monetization systems"],
    whoIsItFor: "Aspiring creators, writers, YouTubers, and digital entrepreneurs who want to build sustainable income from content and digital products.",
    coreCompetencies: ["Copywriting & storytelling", "Video production", "Audience growth", "Digital product creation", "Multi-platform monetization"],
    courseIds: ["creator-economy"],
    learningPaths: [
      {
        id: "content-creator",
        title: "Content Creator & Writer",
        description: "Master copywriting, eBook publishing, and written content monetization",
        targetRole: "Content Creator / Author",
        skillLevel: "beginner",
        estimatedWeeks: 10,
        courseIds: ["creator-economy"],
        capstoneProject: "Published eBook with marketing launch plan",
        careerOutcomes: ["Freelance writer", "eBook author", "Content strategist"],
        competencyMilestones: ["Copywriting portfolio built", "eBook published", "Marketing plan launched"],
        certificationTier: "Practitioner",
        comparisonData: { technicalDepth: "Low", codingIntensity: "None", infrastructureExposure: "Publishing platforms", careerEnvironment: "Freelance & publishing", difficultyLevel: "Beginner", duration: "10 weeks" },
      },
      {
        id: "youtube-entrepreneur",
        title: "YouTube Entrepreneur",
        description: "Build, grow, and monetize a YouTube channel with automation",
        targetRole: "YouTube Creator / Entrepreneur",
        skillLevel: "intermediate",
        estimatedWeeks: 12,
        courseIds: ["creator-economy"],
        capstoneProject: "YouTube channel with 10 optimized videos and monetization strategy",
        careerOutcomes: ["YouTube creator", "Video marketer", "Brand consultant"],
        competencyMilestones: ["Channel launched", "10 videos optimized", "Monetization strategy active"],
        certificationTier: "Specialist",
        comparisonData: { technicalDepth: "Medium", codingIntensity: "None", infrastructureExposure: "YouTube & social platforms", careerEnvironment: "Creator economy & marketing", difficultyLevel: "Intermediate", duration: "12 weeks" },
      },
      {
        id: "digital-business-builder",
        title: "Digital Business Builder",
        description: "Build a complete online business combining content, products, and services",
        targetRole: "Digital Entrepreneur",
        skillLevel: "advanced",
        estimatedWeeks: 14,
        courseIds: ["creator-economy"],
        capstoneProject: "Complete digital business plan with revenue model and launch strategy",
        careerOutcomes: ["Digital entrepreneur", "Online business owner", "Product creator"],
        competencyMilestones: ["Business model validated", "Revenue system built", "Launch strategy executed"],
        certificationTier: "Elite",
        comparisonData: { technicalDepth: "Medium", codingIntensity: "Low", infrastructureExposure: "E-commerce & digital platforms", careerEnvironment: "Entrepreneurship", difficultyLevel: "Advanced", duration: "14 weeks" },
      },
    ],
  },
  {
    id: "civic-leadership",
    name: "Civic Leadership & Governance",
    tagline: "Lead with purpose, govern with integrity",
    icon: "landmark",
    color: "#1B2A4A",
    description: "Develop leadership skills for community impact, public service, and responsible governance in the digital age.",
    focusAreas: ["Public policy literacy", "Community organizing", "Ethical governance", "Digital civic engagement", "Advocacy communication"],
    whoIsItFor: "Aspiring civic leaders, community organizers, policy enthusiasts, and anyone committed to ethical public service and governance in Kenya.",
    coreCompetencies: ["Policy analysis", "Stakeholder engagement", "Public speaking", "Community development", "Project management"],
    courseIds: ["civic-leadership"],
    learningPaths: [
      {
        id: "community-leader",
        title: "Community Leader",
        description: "Organize, mobilize, and lead community development initiatives",
        targetRole: "Community Development Leader",
        skillLevel: "beginner",
        estimatedWeeks: 8,
        courseIds: ["civic-leadership"],
        capstoneProject: "Community initiative proposal with stakeholder map and action plan",
        careerOutcomes: ["Community development officer", "NGO coordinator", "Youth leader"],
        competencyMilestones: ["Needs assessment complete", "Stakeholder map built", "Initiative proposal submitted"],
        certificationTier: "Practitioner",
        comparisonData: { technicalDepth: "Low", codingIntensity: "None", infrastructureExposure: "Community platforms", careerEnvironment: "NGOs & community organizations", difficultyLevel: "Beginner", duration: "8 weeks" },
      },
      {
        id: "policy-analyst",
        title: "Policy Analyst & Advocate",
        description: "Analyze public policy and advocate for evidence-based governance",
        targetRole: "Policy Analyst",
        skillLevel: "intermediate",
        estimatedWeeks: 12,
        courseIds: ["civic-leadership"],
        capstoneProject: "Policy brief on a current Kenyan governance issue",
        careerOutcomes: ["Policy analyst", "Government advisor", "Think tank researcher"],
        competencyMilestones: ["Constitutional literacy certified", "Policy brief published", "Advocacy campaign designed"],
        certificationTier: "Specialist",
        comparisonData: { technicalDepth: "Medium", codingIntensity: "None", infrastructureExposure: "Government systems", careerEnvironment: "Government & think tanks", difficultyLevel: "Intermediate", duration: "12 weeks" },
      },
    ],
  },
];

// Helper: get pillar for a course
export const getPillarForCourse = (courseId: string): Pillar | undefined => {
  return pillars.find(p => p.courseIds.includes(courseId));
};

// Helper: get learning paths for a course
export const getPathsForCourse = (courseId: string): LearningPath[] => {
  const pillar = getPillarForCourse(courseId);
  return pillar?.learningPaths ?? [];
};

// Helper: get pillar by ID
export const getPillarById = (pillarId: string): Pillar | undefined => {
  return pillars.find(p => p.id === pillarId);
};

// Helper: get learning path by ID
export const getPathById = (pathId: string): { path: LearningPath; pillar: Pillar } | undefined => {
  for (const pillar of pillars) {
    const path = pillar.learningPaths.find(lp => lp.id === pathId);
    if (path) return { path, pillar };
  }
  return undefined;
};
