import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import GoldParticles from "@/components/motion/GoldParticles";
import "./pillarHeader.css";

export type PillarTheme =
  | "personal-mastery"
  | "financial-intelligence"
  | "digital-literacy"
  | "cybersecurity"
  | "programming-systems"
  | "creator-economy"
  | "civic-leadership";

interface ThemeConfig {
  accent: string;       // hex accent for icon box + glows
  accentSoft: string;   // rgba for tints
  motif: "orbit" | "candles" | "circuit" | "shield" | "code" | "waves" | "pillars";
}

export const pillarThemes: Record<PillarTheme, ThemeConfig> = {
  "personal-mastery":      { accent: "#7C5CBF", accentSoft: "rgba(124,92,191,0.20)", motif: "orbit" },
  "financial-intelligence":{ accent: "#C9A84C", accentSoft: "rgba(201,168,76,0.20)", motif: "candles" },
  "digital-literacy":      { accent: "#3B82F6", accentSoft: "rgba(59,130,246,0.20)", motif: "circuit" },
  "cybersecurity":         { accent: "#0E7A8A", accentSoft: "rgba(14,122,138,0.22)", motif: "shield" },
  "programming-systems":   { accent: "#2F855A", accentSoft: "rgba(47,133,90,0.22)", motif: "code" },
  "creator-economy":       { accent: "#E0607E", accentSoft: "rgba(224,96,126,0.20)", motif: "waves" },
  "civic-leadership":      { accent: "#C9A84C", accentSoft: "rgba(201,168,76,0.22)", motif: "pillars" },
};

interface PillarHeaderProps {
  theme: PillarTheme;
  title: string;
  tagline?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  recommended?: boolean;
}

/**
 * Reusable themed pillar header.
 * Same navy gradient base across all pillars (#1B2A4A → #0F1B33) with a unique
 * accent colour + animated SVG motif at low opacity per theme.
 */
export default function PillarHeader({
  theme, title, tagline, icon, children, className, recommended,
}: PillarHeaderProps) {
  const cfg = pillarThemes[theme];

  return (
    <header
      className={cn("ph-root", className)}
      style={{
        ["--ph-accent" as never]: cfg.accent,
        ["--ph-accent-soft" as never]: cfg.accentSoft,
      }}
    >
      <div className="ph-motif-layer" aria-hidden>
        <Motif kind={cfg.motif} />
      </div>
      <div className="ph-glow" aria-hidden />
      <GoldParticles count={22} opacity={0.10} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-start gap-4 mb-4">
          {icon && (
            <div className="ph-icon-box" aria-hidden>
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="ph-title">{title}</h1>
              {recommended && (
                <span className="ph-recommended">
                  ★ Recommended for you
                </span>
              )}
            </div>
            {tagline && <p className="ph-tagline">{tagline}</p>}
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}

// ---------- Motifs (animated SVG, ~8-12% opacity via CSS) ----------
function Motif({ kind }: { kind: ThemeConfig["motif"] }) {
  switch (kind) {
    case "orbit":
      return (
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" className="ph-motif">
          {[120, 170, 230, 300].map((r, i) => (
            <circle key={r} cx="400" cy="200" r={r} fill="none"
              stroke="currentColor" strokeWidth="1" strokeDasharray="2 6"
              style={{ transformOrigin: "400px 200px", animation: `ph-spin ${30 + i * 10}s linear infinite ${i % 2 ? "reverse" : ""}` }} />
          ))}
          <circle cx="400" cy="200" r="6" fill="currentColor" />
        </svg>
      );
    case "candles":
      return (
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" className="ph-motif">
          {Array.from({ length: 24 }).map((_, i) => {
            const x = 20 + i * 33;
            const h = 30 + ((i * 53) % 120);
            const y = 200 - h / 2;
            return (
              <g key={i} style={{ animation: `ph-rise 6s ease-in-out infinite ${(i % 6) * 0.4}s` }}>
                <line x1={x} y1={y - 10} x2={x} y2={y + h + 10} stroke="currentColor" strokeWidth="1" />
                <rect x={x - 5} y={y} width="10" height={h} fill="currentColor" opacity="0.7" />
              </g>
            );
          })}
        </svg>
      );
    case "circuit":
      return (
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" className="ph-motif">
          <path d="M0 100 H200 V200 H400 V80 H600 V260 H800" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M0 300 H150 V220 H350 V340 H550 V160 H800" fill="none" stroke="currentColor" strokeWidth="1.2" />
          {[100, 250, 420, 580, 720].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 ? 220 : 160} r="4" fill="currentColor"
              style={{ animation: `ph-pulse 2.4s ease-in-out infinite ${i * 0.3}s` }} />
          ))}
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" className="ph-motif">
          {[1, 2, 3, 4].map((i) => (
            <path key={i} d={`M400 ${60 + i * 30} L${510 + i * 25} ${130 + i * 20} L${510 + i * 25} ${230 + i * 20} L400 ${340 - i * 10} L${290 - i * 25} ${230 + i * 20} L${290 - i * 25} ${130 + i * 20} Z`}
              fill="none" stroke="currentColor" strokeWidth="1"
              style={{ animation: `ph-pulse 4s ease-in-out infinite ${i * 0.6}s` }} />
          ))}
        </svg>
      );
    case "code":
      return (
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" className="ph-motif">
          {Array.from({ length: 18 }).map((_, i) => {
            const y = 30 + i * 22;
            const w = 80 + ((i * 71) % 320);
            const x = 40 + ((i * 47) % 200);
            return (
              <rect key={i} x={x} y={y} width={w} height="6" rx="2" fill="currentColor"
                style={{ animation: `ph-drift 8s linear infinite ${i * 0.2}s` }} />
            );
          })}
        </svg>
      );
    case "waves":
      return (
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" className="ph-motif">
          {[0, 1, 2, 3].map((i) => (
            <path key={i}
              d={`M0 ${120 + i * 50} Q200 ${60 + i * 50} 400 ${120 + i * 50} T800 ${120 + i * 50}`}
              fill="none" stroke="currentColor" strokeWidth="1.4"
              style={{ animation: `ph-wave 9s ease-in-out infinite ${i * 0.8}s` }} />
          ))}
        </svg>
      );
    case "pillars":
      return (
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" className="ph-motif">
          {[120, 260, 400, 540, 680].map((x, i) => (
            <g key={x} style={{ animation: `ph-pulse 5s ease-in-out infinite ${i * 0.5}s` }}>
              <rect x={x - 30} y="80" width="60" height="20" fill="currentColor" />
              <rect x={x - 20} y="100" width="40" height="200" fill="currentColor" opacity="0.7" />
              <rect x={x - 35} y="300" width="70" height="24" fill="currentColor" />
            </g>
          ))}
        </svg>
      );
  }
}