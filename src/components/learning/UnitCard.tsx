import { Link } from "react-router-dom";
import { Lock, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Unit, UserUnitProgress, PillarTheme } from "@/hooks/useUnits";
import { getPillarMotion } from "@/lib/motion/pillarThemes";

const THEME: Record<PillarTheme, { from: string; to: string; accent: string; text: string }> = {
  financial:        { from: "from-blue-50",    to: "to-blue-100/40",    accent: "bg-blue-600",    text: "text-blue-700" },
  communication:    { from: "from-rose-50",    to: "to-rose-100/40",    accent: "bg-rose-600",    text: "text-rose-700" },
  digital:          { from: "from-cyan-50",    to: "to-cyan-100/40",    accent: "bg-cyan-600",    text: "text-cyan-700" },
  leadership:       { from: "from-violet-50",  to: "to-violet-100/40",  accent: "bg-violet-600",  text: "text-violet-700" },
  entrepreneurship: { from: "from-emerald-50", to: "to-emerald-100/40", accent: "bg-emerald-600", text: "text-emerald-700" },
  creator:          { from: "from-orange-50",  to: "to-orange-100/40",  accent: "bg-orange-600",  text: "text-orange-700" },
  civic:            { from: "from-slate-100",  to: "to-amber-100/40",   accent: "bg-amber-600",   text: "text-amber-700" },
};

interface Props {
  unit: Unit;
  progress?: UserUnitProgress;
  state: "locked" | "current" | "completed" | "available";
  pillarId: string;
}

export default function UnitCard({ unit, progress, state, pillarId }: Props) {
  const t = THEME[unit.theme];
  const theme = getPillarMotion(pillarId);
  const civic = pillarId === "civic-leadership";
  const completed = progress?.sessions_completed ?? 0;
  const pct = Math.min(100, Math.round((completed / unit.session_count) * 100));
  const xpEarned = progress?.xp_earned ?? 0;
  const hours = Math.round(unit.estimated_minutes / 60);

  const isComingSoon = unit.status === "coming_soon";
  const isLocked = state === "locked" || isComingSoon;
  const isCurrent = state === "current" && !isComingSoon;
  const isCompleted = state === "completed";

  const inner = (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 h-full",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        t.from, t.to,
        isLocked && "grayscale opacity-50 pointer-events-none",
        isCurrent && "ring-2 ring-offset-2 shadow-lg",
        isCompleted && "border-emerald-400/60",
      )}
      style={{
        borderColor: civic ? "hsl(var(--premium))" : theme.color,
        boxShadow: isCurrent ? `0 0 0 2px ${civic ? "hsl(var(--premium))" : theme.color}` : undefined,
      }}
    >
      {/* watermark numeral */}
      <div className="absolute -right-2 -top-6 select-none font-black text-[110px] leading-none text-foreground/5">
        {unit.order_index}
      </div>

      {/* status icons */}
      {isLocked && (
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center">
          <Lock className="w-4 h-4" />
        </div>
      )}
      {isCompleted && (
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      )}

      <div className="relative">
        <div className={cn("text-xs font-semibold uppercase tracking-wider mb-2", t.text)}>
          Unit {unit.order_index}
        </div>
        <h3 className="font-bold text-base leading-snug line-clamp-2 min-h-[2.6rem] mb-3">
          {unit.title}
        </h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Clock className="w-3.5 h-3.5" />
          <span>{unit.session_count} sessions · ~{hours} hours</span>
        </div>

        {isComingSoon && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-foreground/10 text-muted-foreground">
            Coming soon
          </span>
        )}

        {!isLocked && (
          <>
            <div className="h-2 rounded-full bg-foreground/10 overflow-hidden mb-2">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: civic ? "hsl(var(--premium))" : theme.color }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{completed}/{unit.session_count} sessions</span>
              <span className={cn("inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700")}>
                <Sparkles className="w-3 h-3" />
                {xpEarned > 0 ? `${xpEarned}/${unit.total_xp}` : unit.total_xp} XP
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (isLocked) return inner;
  return (
    <Link to={`/pillar/${pillarId}/unit/${unit.id}`} className="block h-full">
      {inner}
    </Link>
  );
}