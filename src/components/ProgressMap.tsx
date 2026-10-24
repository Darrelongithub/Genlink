import { safeLocalGet, safeLocalSet } from "@/lib/safeStorage";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePillarXp, formatPillarXp } from "@/hooks/usePlatformXp";
import { usePillarAccess, requirementLabel, type PillarAccess } from "@/hooks/usePillarAccess";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playUnlockChime } from "@/lib/journeySound";
import PillarLandmark from "@/components/journey/PillarLandmark";
import {
  Coins,
  Laptop,
  Crown,
  Shield,
  Code,
  TrendingUp,
  Landmark,
  Check,
  Lock,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";

type Status = "completed" | "current" | "locked";

interface PillarStop {
  num: number;
  id: string;
  title: string;
  icon: LucideIcon;
  completion: number;
  status: Status;
  lockedHint?: string;
}

// Display metadata only — lock state and completion come from get_pillar_access().
const META: { num: number; id: string; title: string; icon: LucideIcon }[] = [
  { num: 1, id: "personal-mastery", title: "Personal Mastery & Mind Renewal", icon: Crown },
  { num: 2, id: "financial-intelligence", title: "Financial Intelligence & Income Systems", icon: Coins },
  { num: 3, id: "digital-literacy", title: "Digital Literacy & Productivity", icon: Laptop },
  { num: 4, id: "cybersecurity", title: "Cybersecurity & Digital Protection", icon: Shield },
  { num: 5, id: "programming-systems", title: "Programming & Intelligent Systems", icon: Code },
  { num: 6, id: "creator-economy", title: "Creator Economy & Digital Monetisation", icon: TrendingUp },
  { num: 7, id: "civic-leadership", title: "Civic Leadership & Governance", icon: Landmark },
];

function toStops(access: PillarAccess[] | undefined): PillarStop[] {
  return META.map((m) => {
    const a = access?.find((x) => x.pillar_id === m.id);
    const pct = a?.progress_pct ?? 0;
    const status: Status = !a || a.state === "locked" ? "locked" : pct >= 100 ? "completed" : "current";
    return { ...m, completion: pct, status, lockedHint: a?.requirements?.length ? requirementLabel(a.requirements) : undefined };
  });
}

// Layout constants for the SVG viewBox.
const VB_W = 1400;
const VB_H = 620;
const ROAD_Y = 320;
const F_X = [110, 340, 570];
const JUNCTION = { x: 780, y: ROAD_Y };
const BRANCH_X = 1130;
const BRANCH_Y = [85, 235, 385, 535];

const foundationPos = F_X.map((x, i) => ({ x, y: ROAD_Y + Math.sin(i * 1.3) * 34 }));
const roadPts = [...foundationPos, JUNCTION];
// Smooth curve through the foundation stops to the crossroads.
const pathD = roadPts
  .map((s, i) => {
    if (i === 0) return `M ${s.x} ${s.y}`;
    const prev = roadPts[i - 1];
    const cx = (prev.x + s.x) / 2;
    return `C ${cx} ${prev.y}, ${cx} ${s.y}, ${s.x} ${s.y}`;
  })
  .join(" ");
// Segment the orb travels when the Foundation is completed: Pillar 3 → crossroads.
const lastLeg = `M ${foundationPos[2].x} ${foundationPos[2].y} C ${(foundationPos[2].x + JUNCTION.x) / 2} ${foundationPos[2].y}, ${(foundationPos[2].x + JUNCTION.x) / 2} ${JUNCTION.y}, ${JUNCTION.x} ${JUNCTION.y}`;
const branchD = BRANCH_Y.map(
  (by) => `M ${JUNCTION.x} ${JUNCTION.y} C ${JUNCTION.x + 170} ${JUNCTION.y}, ${BRANCH_X - 190} ${by}, ${BRANCH_X} ${by}`,
);

/** The learner's recommended specialisation from their latest assessment. */
function useDestination() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["destination", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("assessment_results")
        .select("primary_pillar_recommended, secondary_pillar_recommended")
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const spec = META.slice(3).map((m) => m.id);
      return [data?.primary_pillar_recommended, data?.secondary_pillar_recommended].find((p) => p && spec.includes(p)) ?? null;
    },
  });
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ProgressMap = () => {
  const { data: pillarXp } = usePillarXp();
  const { data: access } = usePillarAccess();
  const { data: destination } = useDestination();
  const { user } = useAuth();
  const navigate = useNavigate();
  const all = useMemo(() => toStops(access), [access]);
  const foundation = all.slice(0, 3);
  const branches = all.slice(3);
  const foundationDone = foundation.every((s) => s.status === "completed");
  const branchesOpen = branches.some((s) => s.status !== "locked");

  // Orb travel to the crossroads, then all four branches light up.
  const [travelling, setTravelling] = useState(false);
  const [lit, setLit] = useState(false);
  const motionRef = useRef<SVGAnimateMotionElement | null>(null);

  const runJunction = () => {
    if (travelling) return;
    if (reducedMotion()) { setLit(true); return; }
    setLit(false);
    setTravelling(true);
    requestAnimationFrame(() => {
      try { motionRef.current?.beginElement(); } catch { /* ignore */ }
    });
  };

  // First time the Foundation is complete, play the junction sequence once.
  useEffect(() => {
    if (!user || !foundationDone) return;
    const key = `genlink_junction_seen_${user.id}`;
    if (safeLocalGet(key)) { setLit(true); return; }
    safeLocalSet(key, "1");
    runJunction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, foundationDone]);

  useEffect(() => {
    const el = motionRef.current;
    if (!el || !travelling) return;
    const handler = () => {
      setLit(true);
      playUnlockChime();
      window.setTimeout(() => setTravelling(false), 1400);
    };
    el.addEventListener("endEvent", handler);
    return () => el.removeEventListener("endEvent", handler);
  }, [travelling]);

  const handleClick = (stop: PillarStop) => {
    if (stop.status === "locked") {
      toast.error(stop.lockedHint ? `Locked: ${stop.lockedHint}` : "Complete the Foundation to unlock");
      return;
    }
    navigate(`/pillar/${stop.id}`);
  };

  const junctionLit = lit || (branchesOpen && !travelling);

  const renderStop = (s: PillarStop, x: number, y: number, unlocking: boolean) => {
    const isCompleted = s.status === "completed";
    const isCurrent = s.status === "current";
    const isLocked = s.status === "locked";
    const isDest = destination === s.id;
    const platformFill = isCompleted ? "#1B2A4A" : isCurrent ? "#0F1B33" : "#0A1226";
    const platformStroke = isCompleted ? "#C9A84C" : isCurrent ? "#F1CF6A" : "#3A4A6E";
    return (
      <g
        key={s.id}
        transform={`translate(${x} ${y})`}
        className="cursor-pointer"
        onClick={() => handleClick(s)}
        role="button"
        aria-label={`Pillar ${s.num}: ${s.title}${isLocked ? " (locked)" : ""}${isDest ? " (recommended for you)" : ""}`}
      >
        {isCurrent && (
          <circle r="32" fill="none" stroke="#F1CF6A" strokeWidth="2" className="pm-pulse-ring" opacity="0.8" />
        )}
        <g className={unlocking ? "pm-unlock" : undefined}>
          <circle
            r="30"
            fill={unlocking ? "#C9A84C" : platformFill}
            stroke={unlocking ? "#F1CF6A" : platformStroke}
            strokeWidth="2"
            className={isCompleted ? "node-completed-glow" : isCurrent ? "node-breathe" : undefined}
          />
          <PillarLandmark pillar={s.num} status={s.status} />
        </g>
        {isLocked && (
          <g transform="translate(-8 -8)" pointerEvents="none" opacity="0.9">
            <Lock size={16} color="#F1CF6A" strokeWidth={2.5} />
          </g>
        )}
        <g transform="translate(24 -30)">
          <circle r="11" fill="#F1CF6A" stroke="#0F1B33" strokeWidth="1.5" />
          <text textAnchor="middle" dy="4" fontSize="12" fontWeight="700" fill="#0F1B33">{s.num}</text>
        </g>
        {isDest && (
          <g transform="translate(-62 -62)">
            <rect width="124" height="20" rx="10" fill="#C9A84C" />
            <text x="62" y="14" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0F1B33">★ Recommended for you</text>
          </g>
        )}
        <g transform="translate(0 50)">
          <text textAnchor="middle" fontSize="13" fontWeight="600" fill="#F9F6F0">{s.title}</text>
          <text textAnchor="middle" y="17" fontSize="11" fill="#E9DFC6" opacity="0.7">
            {formatPillarXp(pillarXp?.[s.id])} · {s.completion}%{isDest ? " · Your destination" : ""}
          </text>
        </g>
      </g>
    );
  };

  return (
    <section
      aria-label="Learning journey progress map"
      className="w-full"
      style={{ background: "linear-gradient(180deg,#0A1226 0%,#0F1B33 55%,#152647 100%)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="mb-8 text-center">
          <h1 className="h-serif-gold center text-3xl md:text-4xl lg:text-5xl tracking-tight reveal-in" style={{ color: "#F1CF6A" }}>
            Your Journey
          </h1>
          <p className="mt-2 text-sm md:text-base" style={{ color: "#E9DFC6", opacity: 0.7 }}>
            Build the Foundation, then choose your path at the crossroads.
          </p>
        </div>

        {/* DESKTOP LAYOUT — Foundation road to a crossroads that forks four ways (hidden below md) */}
        <div className="hidden md:block overflow-x-auto overflow-y-hidden -mx-4 px-4 pb-4">
          <div className="min-w-[900px] md:min-w-0">
            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto" role="img" aria-label="Pillar progression path">
              <defs>
                <linearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#08101F" />
                  <stop offset="100%" stopColor="#152647" />
                </linearGradient>
                <radialGradient id="horizonGlow" cx="82%" cy="50%" r="55%">
                  <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.22" />
                  <stop offset="70%" stopColor="#C9A84C" stopOpacity="0" />
                </radialGradient>
                <filter id="road-glow" x="-20%" y="-50%" width="140%" height="200%">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
                <style>{`
                  @keyframes pm-pulse { 0% { transform: scale(1); opacity: 0.6; } 70%,100% { transform: scale(2.2); opacity: 0; } }
                  .pm-pulse-ring { transform-origin: center; transform-box: fill-box; animation: pm-pulse 2s ease-out infinite; }
                  @keyframes pm-unlock { 0% { transform: scale(0.8); opacity: 0.3; } 60% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
                  .pm-unlock { transform-origin: center; transform-box: fill-box; animation: pm-unlock 0.6s cubic-bezier(.34,1.56,.64,1) 1 both; }
                  @keyframes pm-particle { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(var(--pm-dx), var(--pm-dy)) scale(0.3); opacity: 0; } }
                  .pm-particle { transform-origin: center; transform-box: fill-box; animation: pm-particle 0.9s ease-out forwards; }
                  @keyframes pm-orb-pulse { 0%,100% { opacity: 0.95; } 50% { opacity: 0.7; } }
                  .pm-orb-pulse { animation: pm-orb-pulse 1.2s ease-in-out infinite; }
                  @keyframes pm-branch-light { from { stroke-dashoffset: 600; } to { stroke-dashoffset: 0; } }
                  .pm-branch-light { stroke-dasharray: 600; animation: pm-branch-light 1s ease-out both; }
                  @media (prefers-reduced-motion: reduce) {
                    .pm-pulse-ring, .pm-unlock, .pm-particle, .pm-orb-pulse, .pm-branch-light { animation: none !important; stroke-dasharray: none; }
                  }
                `}</style>
                <radialGradient id="pm-orb-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFF6D8" stopOpacity="1" />
                  <stop offset="45%" stopColor="#F1CF6A" stopOpacity="0.95" />
                  <stop offset="80%" stopColor="#C9A84C" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
                </radialGradient>
                <filter id="pm-orb-blur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
                <path id="pm-road-path" d={lastLeg} fill="none" />
              </defs>

              <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#skyFade)" />
              <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#horizonGlow)" pointerEvents="none" />
              {Array.from({ length: 48 }).map((_, i) => {
                const seed = (i * 9301 + 49297) % 233280;
                const r = (n: number) => ((seed * (n + 1)) % 1000) / 1000;
                return <circle key={i} cx={r(1) * VB_W} cy={r(2) * VB_H} r={0.6 + r(3) * 1.2} fill="#F9F6F0" opacity={0.25 + r(4) * 0.45} />;
              })}

              {/* Village silhouette (start of the road) */}
              <g opacity="0.9" transform={`translate(0 ${ROAD_Y - 260})`}>
                <polygon points="20,260 50,220 80,260" fill="#0A1226" stroke="#3A4A6E" strokeWidth="1" />
                <rect x="30" y="258" width="40" height="30" fill="#0A1226" stroke="#3A4A6E" strokeWidth="1" />
                <rect x="44" y="270" width="12" height="18" fill="#C9A84C" opacity="0.7" />
              </g>

              {/* Group labels */}
              <text x={F_X[1]} y={ROAD_Y - 120} textAnchor="middle" fontSize="12" letterSpacing="3" fill="#C9A84C" opacity="0.85">FOUNDATION</text>
              <text x={BRANCH_X} y="30" textAnchor="middle" fontSize="12" letterSpacing="3" fill="#C9A84C" opacity="0.85">CHOOSE YOUR PATH</text>

              {/* Branch roads — dim until the Foundation is built, then lit */}
              {branchD.map((d, i) => (
                <g key={i}>
                  {junctionLit && <path d={d} fill="none" stroke="#C9A84C" strokeWidth="14" strokeLinecap="round" opacity="0.3" filter="url(#road-glow)" />}
                  <path d={d} fill="none" stroke="#08101F" strokeWidth="8" strokeLinecap="round" />
                  <path
                    d={d}
                    fill="none"
                    stroke={junctionLit ? "#F1CF6A" : "#3A4A6E"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    className={lit ? "pm-branch-light" : undefined}
                    strokeDasharray={lit ? undefined : "6 10"}
                    opacity={junctionLit ? 0.9 : 0.6}
                  />
                </g>
              ))}

              {/* Foundation road */}
              <path d={pathD} fill="none" stroke="#C9A84C" strokeWidth="18" strokeLinecap="round" opacity="0.35" filter="url(#road-glow)" />
              <path d={pathD} fill="none" stroke="#08101F" strokeWidth="10" strokeLinecap="round" />
              <path d={pathD} fill="none" stroke="#F1CF6A" strokeWidth="2" strokeDasharray="10 14" strokeLinecap="round" opacity="0.85" />

              {/* Crossroads */}
              <g transform={`translate(${JUNCTION.x} ${JUNCTION.y})`} aria-label="Crossroads">
                <circle r="18" fill={junctionLit ? "#C9A84C" : "#0A1226"} stroke={junctionLit ? "#F1CF6A" : "#3A4A6E"} strokeWidth="2" className={lit ? "pm-unlock" : undefined} />
                <path d="M -7 0 L 7 0 M 0 -7 L 0 7" stroke={junctionLit ? "#0F1B33" : "#3A4A6E"} strokeWidth="2.5" strokeLinecap="round" />
                <text y="38" textAnchor="middle" fontSize="11" fill="#E9DFC6" opacity="0.75">Crossroads</text>
              </g>

              {foundation.map((s, i) => renderStop(s, foundationPos[i].x, foundationPos[i].y, false))}
              {branches.map((s, i) => renderStop(s, BRANCH_X, BRANCH_Y[i], lit && travelling))}

              {travelling && (
                <g className="pm-orb-pulse">
                  <circle r="22" fill="url(#pm-orb-grad)" filter="url(#pm-orb-blur)" />
                  <circle r="10" fill="#FFF6D8" opacity="0.9" />
                  <animateMotion ref={motionRef} dur="1.5s" fill="freeze" calcMode="spline" keySplines="0.42 0 0.58 1" keyTimes="0;1" begin="indefinite">
                    <mpath href="#pm-road-path" />
                  </animateMotion>
                </g>
              )}

              {lit && travelling && (
                <g transform={`translate(${JUNCTION.x} ${JUNCTION.y})`}>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i / 12) * Math.PI * 2;
                    const dist = 60 + (i % 3) * 12;
                    return (
                      <circle
                        key={i}
                        r={3 + (i % 2)}
                        fill="#C9A84C"
                        className="pm-particle"
                        style={{ ["--pm-dx" as any]: `${Math.cos(angle) * dist}px`, ["--pm-dy" as any]: `${Math.sin(angle) * dist}px`, animationDelay: `${(i % 4) * 30}ms` }}
                      />
                    );
                  })}
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* MOBILE LAYOUT — vertical Foundation road, then the crossroads and four branches */}
        <MobileJourney stops={foundation} travelFromIdx={travelling ? 2 : null} unlockedIdx={null} onSelect={handleClick} />
        <MobileBranches stops={branches} lit={junctionLit} destination={destination ?? null} onSelect={handleClick} />

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs" style={{ color: "#E9DFC6" }}>
          <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{ background: "#C9A84C" }} />Completed</span>
          <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{ background: "#F1CF6A" }} />Open</span>
          <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{ background: "#3A4A6E" }} />Locked</span>
        </div>

        {/* Preview the crossroads animation */}
        <div className="mt-4 flex items-center justify-center">
          <button
            type="button"
            onClick={runJunction}
            disabled={travelling}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-[#C9A84C]/40 text-[#F1CF6A] hover:bg-[#C9A84C] hover:text-[#0F1B33] transition-colors disabled:opacity-40"
            aria-label="Preview the crossroads unlock animation"
          >
            <Sparkles className="w-3 h-3" />
            Preview crossroads unlock
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProgressMap;

function MobileBranches({ stops, lit, destination, onSelect }: { stops: PillarStop[]; lit: boolean; destination: string | null; onSelect: (s: PillarStop) => void }) {
  const { data: pillarXp } = usePillarXp();
  return (
    <div className="md:hidden mx-auto mt-2" style={{ maxWidth: 480 }}>
      <div className="flex flex-col items-center mb-3">
        <span
          className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold"
          style={{ background: lit ? "#C9A84C" : "#0A1226", borderColor: lit ? "#F1CF6A" : "#3A4A6E", color: lit ? "#0F1B33" : "#3A4A6E" }}
          aria-hidden="true"
        >+</span>
        <span className="text-[11px] tracking-[0.2em] mt-1" style={{ color: "#C9A84C" }}>CROSSROADS · CHOOSE YOUR PATH</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stops.map((s) => {
          const Icon = s.icon;
          const isLocked = s.status === "locked";
          const isDest = destination === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              aria-label={`Pillar ${s.num}: ${s.title}${isLocked ? " (locked)" : ""}`}
              className={`relative rounded-xl border p-3 text-left transition-all ${isLocked ? "opacity-50 bg-[#EFE7D5] border-[#C9C4BA]" : "bg-white border-[#1B2A4A]/15 active:scale-[0.98]"} ${isDest ? "ring-2 ring-[#C9A84C]" : ""}`}
              style={{ color: "#1B2A4A" }}
            >
              {isDest && (
                <span className="absolute -top-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "#C9A84C", color: "#0F1B33" }}>
                  <Star className="w-3 h-3" /> Recommended for you
                </span>
              )}
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold" style={{ background: isLocked ? "#C9C4BA" : "#1B2A4A", color: "#fff" }}>{s.num}</span>
                {isLocked ? <Lock className="w-4 h-4" /> : s.status === "completed" ? <Check className="w-4 h-4" style={{ color: "#C9A84C" }} /> : <Icon className="w-4 h-4" style={{ color: "#C9A84C" }} />}
              </div>
              <div className="text-sm font-semibold leading-tight">{s.title}</div>
              <div className="text-[11px] mt-1 opacity-70">{formatPillarXp(pillarXp?.[s.id])} · {s.completion}%</div>
              {isDest && <div className="text-[11px] mt-1 font-semibold" style={{ color: "#A8862F" }}>Your destination</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ============================================================
// Mobile vertical zigzag layout
// ============================================================

interface MobileJourneyProps {
  stops: PillarStop[];
  travelFromIdx: number | null;
  unlockedIdx: number | null;
  onSelect: (s: PillarStop) => void;
}

const CARD_STEP = 140; // vertical spacing between nodes (px)
const CARD_TOP = 40;   // offset before first node

function MobileJourney({ stops, travelFromIdx, unlockedIdx, onSelect }: MobileJourneyProps) {
  const { data: pillarXp } = usePillarXp();
  const totalHeight = CARD_TOP + stops.length * CARD_STEP;
  // Vertical winding path down the centre with subtle left/right sway.
  const pathPoints = stops.map((_, i) => {
    const y = CARD_TOP + i * CARD_STEP;
    const sway = Math.sin(i * 0.9) * 18;
    return { x: 50 + sway, y };
  });
  const verticalPath = pathPoints
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pathPoints[i - 1];
      const cy = (prev.y + p.y) / 2;
      return `C ${prev.x} ${cy}, ${p.x} ${cy}, ${p.x} ${p.y}`;
    })
    .join(" ");

  return (
    <div className="md:hidden relative mx-auto" style={{ maxWidth: 480, height: totalHeight }}>
      {/* Road svg spans the full column */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 100 ${totalHeight}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <path id="pm-road-path-v" d={verticalPath} fill="none" />
          <radialGradient id="pm-orb-grad-v" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF6D8" stopOpacity="1" />
            <stop offset="45%" stopColor="#F1CF6A" stopOpacity="0.95" />
            <stop offset="80%" stopColor="#C9A84C" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={verticalPath} stroke="#1B2A4A" strokeWidth="3" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={verticalPath} stroke="#F9F6F0" strokeWidth="1" strokeDasharray="4 6" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {travelFromIdx !== null && (
          <g className="pm-orb-pulse">
            <circle r="4" fill="url(#pm-orb-grad-v)" />
            <circle r="1.6" fill="#FFF6D8" opacity="0.9" />
            <animateMotion dur="1.5s" fill="freeze" begin="0s">
              <mpath href="#pm-road-path-v" />
            </animateMotion>
          </g>
        )}
      </svg>

      {/* Alternating zigzag cards */}
      <ol className="relative">
        {stops.map((s, i) => {
          const Icon = s.icon;
          const isLocked = s.status === "locked";
          const isCompleted = s.status === "completed";
          const isCurrent = s.status === "current";
          const isUnlocking = unlockedIdx === i;
          const side = i % 2 === 0 ? "left" : "right";
          const nodeFill = isCompleted ? "#C9A84C" : isCurrent ? "#1B2A4A" : "#C9C4BA";

          return (
            <li
              key={s.id}
              className="absolute inset-x-0 flex items-center"
              style={{
                top: CARD_TOP + i * CARD_STEP - 40,
                height: 80,
                flexDirection: side === "left" ? "row" : "row-reverse",
              }}
            >
              {/* Card */}
              <button
                type="button"
                onClick={() => onSelect(s)}
                disabled={isLocked}
                aria-label={`Pillar ${s.num}: ${s.title}${isLocked ? " (locked)" : ""}`}
                className={`w-[42%] rounded-xl border p-3 text-left shadow-sm transition-all ${
                  isLocked
                    ? "opacity-50 cursor-not-allowed bg-[#EFE7D5] border-[#C9C4BA]"
                    : "bg-white border-[#1B2A4A]/15 hover:shadow-md active:scale-[0.98]"
                } ${isUnlocking ? "ring-2 ring-[#C9A84C]" : ""}`}
                style={{ color: "#1B2A4A" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
                    style={{ background: nodeFill, color: "#fff" }}
                  >
                    {s.num}
                  </span>
                  {isLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : isCompleted ? (
                    <Check className="w-4 h-4" style={{ color: "#C9A84C" }} />
                  ) : (
                    <Icon className="w-4 h-4" style={{ color: "#C9A84C" }} />
                  )}
                </div>
                <div className="text-sm font-semibold leading-tight">{s.title}</div>
                <div className="text-[11px] mt-1 opacity-70">
                  {formatPillarXp(pillarXp?.[s.id])} · {s.completion}%
                </div>
              </button>

              {/* Spacer for road column */}
              <div className="w-[16%]" />

              {/* Node circle on the road (visual anchor) */}
              <div
                className="w-[42%] flex"
                style={{ justifyContent: side === "left" ? "flex-start" : "flex-end" }}
              >
                <span
                  className={`block w-4 h-4 rounded-full border-2 ${
                    isCurrent ? "animate-pulse" : ""
                  }`}
                  style={{
                    background: nodeFill,
                    borderColor: isCompleted ? "#A8862F" : isCurrent ? "#0F1B33" : "#A8A498",
                    marginLeft: side === "left" ? "-12px" : 0,
                    marginRight: side === "right" ? "-12px" : 0,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}