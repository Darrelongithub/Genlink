// Illustrated SVG landmarks for each of the 7 pillars.
// Rendered inside ProgressMap; sized to fit inside a ~52px node region.
// Colors follow status: completed = warm gold, current = breathing gold, locked = dark silhouette.

import type { ReactNode } from "react";

type Status = "completed" | "current" | "locked";

interface Props {
  pillar: number; // 1..7
  status: Status;
}

function palette(status: Status) {
  if (status === "completed") return { fill: "#F1CF6A", stroke: "#C9A84C", accent: "#FFF6D8", glow: 0.9 };
  if (status === "current") return { fill: "#F1CF6A", stroke: "#C9A84C", accent: "#FFF6D8", glow: 1.0 };
  return { fill: "#1B2A4A", stroke: "#3A4A6E", accent: "#5A6B90", glow: 0.0 };
}

// Each landmark is drawn in a local 40x40 coordinate space centred on (0,0).
// Consumer <g transform="translate(x,y)"> handles placement.
export default function PillarLandmark({ pillar, status }: Props): ReactNode {
  const p = palette(status);
  const dim = status === "locked" ? 0.55 : 1;
  const base = (
    <g opacity={dim}>{renderLandmark(pillar, p)}</g>
  );
  return base;
}

function renderLandmark(pillar: number, p: ReturnType<typeof palette>) {
  switch (pillar) {
    case 1: // Personal Mastery — mountain peak with flag
      return (
        <g>
          <polygon points="-18,14 -2,-12 6,0 18,14" fill={p.fill} stroke={p.stroke} strokeWidth={1.5} />
          <polygon points="-6,4 2,-4 10,4" fill={p.stroke} opacity={0.8} />
          <line x1={-2} y1={-12} x2={-2} y2={-20} stroke={p.stroke} strokeWidth={1.5} />
          <polygon points="-2,-20 6,-17 -2,-14" fill={p.accent} />
        </g>
      );
    case 2: // Financial Intelligence — vault/bank with coins
      return (
        <g>
          <rect x={-16} y={-4} width={32} height={20} fill={p.fill} stroke={p.stroke} strokeWidth={1.5} rx={2} />
          <polygon points="-18,-4 18,-4 0,-16" fill={p.fill} stroke={p.stroke} strokeWidth={1.5} />
          <rect x={-4} y={2} width={8} height={14} fill={p.stroke} />
          <circle cx={-10} cy={9} r={2} fill={p.accent} />
          <circle cx={10} cy={9} r={2} fill={p.accent} />
          <text x={0} y={-8} textAnchor="middle" fontSize={7} fontWeight={700} fill={p.stroke}>Ksh</text>
        </g>
      );
    case 3: // Digital Literacy — glowing laptop
      return (
        <g>
          <rect x={-14} y={-8} width={28} height={16} fill={p.fill} stroke={p.stroke} strokeWidth={1.5} rx={1.5} />
          <rect x={-11} y={-6} width={22} height={12} fill={p.stroke} />
          <text x={0} y={2} textAnchor="middle" fontSize={7} fontWeight={700} fill={p.accent}>{"</>"}</text>
          <path d="M -18 10 L 18 10 L 14 14 L -14 14 Z" fill={p.stroke} />
        </g>
      );
    case 4: // Cybersecurity — shield with keyhole
      return (
        <g>
          <path d="M 0 -18 L 14 -12 V 2 C 14 11 7 16 0 18 C -7 16 -14 11 -14 2 V -12 Z" fill={p.fill} stroke={p.stroke} strokeWidth={1.5} />
          <circle cx={0} cy={-2} r={3.5} fill={p.stroke} />
          <rect x={-1.5} y={-1} width={3} height={8} fill={p.stroke} />
          <path d="M -8 -8 L 0 -11 L 8 -8" fill="none" stroke={p.accent} strokeWidth={1.2} opacity={0.8} />
        </g>
      );
    case 5: // Programming & Intelligent Systems — server stack with braces
      return (
        <g>
          <rect x={-15} y={-14} width={30} height={9} rx={1.5} fill={p.fill} stroke={p.stroke} strokeWidth={1.3} />
          <rect x={-15} y={-3} width={30} height={9} rx={1.5} fill={p.fill} stroke={p.stroke} strokeWidth={1.3} />
          <circle cx={-10} cy={-9.5} r={1.4} fill={p.stroke} />
          <circle cx={-10} cy={1.5} r={1.4} fill={p.stroke} />
          <text x={0} y={16} textAnchor="middle" fontSize={9} fontWeight={700} fill={p.fill}>{"{ }"}</text>
        </g>
      );
    case 6: // Creator Economy — ring-light studio
      return (
        <g>
          <circle cx={0} cy={-2} r={12} fill="none" stroke={p.fill} strokeWidth={3} />
          <circle cx={0} cy={-2} r={5} fill={p.stroke} />
          <polygon points="-3,3 -3,-7 5,-2" fill={p.accent} />
          <line x1={0} y1={10} x2={0} y2={16} stroke={p.stroke} strokeWidth={1.5} />
          <line x1={-6} y1={16} x2={6} y2={16} stroke={p.stroke} strokeWidth={1.5} />
        </g>
      );
    case 7: // Civic Leadership — parliament with scales
      return (
        <g>
          <rect x={-16} y={2} width={32} height={12} fill={p.fill} stroke={p.stroke} strokeWidth={1.5} />
          <polygon points="-18,2 18,2 0,-8" fill={p.fill} stroke={p.stroke} strokeWidth={1.5} />
          <line x1={-10} y1={2} x2={-10} y2={14} stroke={p.stroke} strokeWidth={1.2} />
          <line x1={0} y1={2} x2={0} y2={14} stroke={p.stroke} strokeWidth={1.2} />
          <line x1={10} y1={2} x2={10} y2={14} stroke={p.stroke} strokeWidth={1.2} />
          <line x1={-6} y1={-4} x2={6} y2={-4} stroke={p.accent} strokeWidth={1.2} />
          <circle cx={-6} cy={-4} r={1.5} fill={p.accent} />
          <circle cx={6} cy={-4} r={1.5} fill={p.accent} />
        </g>
      );
    default:
      return <circle r={12} fill={p.fill} stroke={p.stroke} strokeWidth={1.5} />;
  }
}