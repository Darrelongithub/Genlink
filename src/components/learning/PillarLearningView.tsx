import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, CheckCircle2, Trophy } from "lucide-react";
import UnitCard from "@/components/learning/UnitCard";
import SpecializedUnitCard from "@/components/learning/SpecializedUnitCard";
import PillarCalibrationCard from "@/components/learning/PillarCalibrationCard";
import { usePillarUnits, useUserUnitProgress, type Unit, type UserUnitProgress } from "@/hooks/useUnits";
import type { Pillar } from "@/data/courses";
import { usePillarXp } from "@/hooks/usePlatformXp";
import { getPillarMotion } from "@/lib/motion/pillarThemes";

interface Props {
  pillar: Pillar;
  icon: React.ReactNode;
}

/**
 * Authenticated + enrolled learning surface for a single pillar.
 * Replaces the marketing cards with a compact header, unit grid,
 * and a prominent "Continue" call on the first incomplete unit.
 */
export default function PillarLearningView({ pillar, icon }: Props) {
  const theme = getPillarMotion(pillar.id);
  const { data: pillarXp } = usePillarXp();
  const pillarTotalXp = pillarXp?.[pillar.id]?.total;
  const civic = pillar.id === "civic-leadership";
  const { data: units = [] } = usePillarUnits(pillar.id);
  const { data: progressMap = {} } = useUserUnitProgress(units.map((u) => u.id));
  const [recommendedUnitId, setRecommendedUnitId] = useState<string | null>(null);

  const learningPathUnits = units.filter((u) => u.track_type === "learning_path");
  const specializedUnits = units.filter((u) => u.track_type === "specialized");
  // Progress, XP and unlocking count only live units that count toward completion.
  const countedUnits = learningPathUnits.filter((u) => u.status === "live" && u.counts_toward_completion);

  const unitsComplete = countedUnits.filter(
    (u) => (progressMap[u.id]?.sessions_completed ?? 0) >= u.session_count && u.session_count > 0,
  ).length;
  const xpEarned = Object.values(progressMap).reduce(
    (acc, p: UserUnitProgress) => acc + (p?.xp_earned ?? 0),
    0,
  );

  // Locate the first incomplete learning-path unit — or the calibration's pick if untouched.
  const firstIncomplete: Unit | undefined = countedUnits.find(
    (u) => (progressMap[u.id]?.sessions_completed ?? 0) < u.session_count,
  );
  const recommended = recommendedUnitId
    ? countedUnits.find((u) => u.id === recommendedUnitId)
    : undefined;
  const anyProgress = Object.values(progressMap).some((p) => (p?.sessions_completed ?? 0) > 0);
  const nextUnit: Unit | undefined = !anyProgress && recommended ? recommended : firstIncomplete;

  const getState = (unit: Unit): "locked" | "current" | "completed" | "available" => {
    const prog = progressMap[unit.id];
    const completed = prog?.sessions_completed ?? 0;
    if (completed >= unit.session_count && unit.session_count > 0) return "completed";
    const prev = countedUnits.find((u) => u.order_index === unit.order_index - 1);
    const prevDone = !prev || (progressMap[prev.id]?.sessions_completed ?? 0) >= prev.session_count;
    if (unit.order_index === 1 || prevDone) return unit.id === nextUnit?.id ? "current" : "available";
    return "locked";
  };

  return (
    <div className="space-y-8">
      {/* Compact header */}
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: pillar.color }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Enrolled Pillar
            </p>
            <h1 className="text-xl md:text-2xl font-bold leading-tight">{pillar.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-medium text-foreground">{unitsComplete}</span> of {countedUnits.length} units complete
              </span>
              <span className="text-border">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="font-medium text-foreground">{xpEarned.toLocaleString()}</span>{pillarTotalXp !== undefined && <> / {pillarTotalXp.toLocaleString()}</>} XP earned
              </span>
            </div>
          </div>
          {nextUnit ? (
            <Button
              asChild
              size="lg"
              className="font-semibold shadow-md"
              style={{ backgroundColor: civic ? "hsl(var(--premium))" : theme.color, color: civic ? "hsl(var(--primary))" : "hsl(var(--primary-foreground))" }}
            >
              <Link to={`/pillar/${pillar.id}/unit/${nextUnit.id}`}>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          ) : (
            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 px-3 py-1.5">
              <Trophy className="w-4 h-4" />
              Pillar complete
            </Badge>
          )}
        </div>
      </div>

      <PillarCalibrationCard
        pillarId={pillar.id}
        units={units}
        onRecommendedUnitId={setRecommendedUnitId}
      />

      {/* Learning path units */}
      {learningPathUnits.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Your 7 Units</h2>
            <p className="text-sm text-muted-foreground">Structured, sequential — each unit unlocks the next.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {learningPathUnits.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                progress={progressMap[unit.id]}
                state={getState(unit)}
                pillarId={pillar.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Specialised content */}
      {specializedUnits.length > 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold">Specialised Content</h3>
            <p className="text-xs text-muted-foreground">Bonus tracks and deep dives — optional enrichment.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {specializedUnits.map((unit) => (
              <SpecializedUnitCard key={unit.id} unit={unit} pillarId={pillar.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}