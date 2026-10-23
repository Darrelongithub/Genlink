/**
 * Per-pillar motion theming for zoom transitions and ambient overlays.
 * Keyed by canonical pillar id used across the app (see src/data/courses.ts).
 * Each entry gives the hue used by PillarZoomLink bursts + the glyph set
 * that rushes outward on navigation.
 */
export interface PillarMotionTheme {
  /** Human-facing label — for docs / debug only. */
  label: string;
  /** Hex hue used for burst particles + glow. */
  color: string;
  /** Small glyph rotation used by the zoom burst. Keep to 2 chars max. */
  glyphs: string[];
}

export const pillarMotionThemes: Record<string, PillarMotionTheme> = {
  "personal-mastery": {
    label: "Personal Mastery & Mind Renewal",
    color: "#7C5CBF",
    glyphs: ["▲", "✧", "☀"],
  },
  "financial-intelligence": {
    label: "Financial Intelligence & Income Systems",
    color: "#C9A84C",
    glyphs: ["◉", "Ksh", "✦"],
  },
  "digital-literacy": {
    label: "Digital Literacy & Productivity",
    color: "#3B82F6",
    glyphs: ["</>", "·", "•"],
  },
  "cybersecurity": {
    label: "Cybersecurity & Digital Protection",
    color: "#0E7A8A",
    glyphs: ["⛨", "◈", "✦"],
  },
  "programming-systems": {
    label: "Programming & Intelligent Systems",
    color: "#2F855A",
    glyphs: ["{ }", "λ", "✦"],
  },
  "creator-economy": {
    label: "Creator Economy & Digital Monetisation",
    color: "#E0607E",
    glyphs: ["▶", "♥", "✦"],
  },
  "civic-leadership": {
    label: "Civic Leadership & Governance",
    color: "#1B2A4A",
    glyphs: ["⚖", "★", "✦"],
  },
};

export const defaultPillarMotion: PillarMotionTheme = {
  label: "Default",
  color: "#C9A84C",
  glyphs: ["✦"],
};

export const getPillarMotion = (pillarId?: string | null): PillarMotionTheme =>
  (pillarId && pillarMotionThemes[pillarId]) || defaultPillarMotion;