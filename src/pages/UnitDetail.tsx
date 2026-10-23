import { Link, Navigate, useParams } from "react-router-dom";
import StickyNav from "@/components/StickyNav";
import { getPillarById } from "@/data/courses";
import { useUnit, useUnitSessions, useUserUnitProgress } from "@/hooks/useUnits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Clock, Sparkles, CheckCircle2, Lock, PlayCircle, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GoldParticles } from "@/components/motion";
import { useUserRole } from "@/hooks/useUserRole";
import { getPillarMotion } from "@/lib/motion/pillarThemes";

export default function UnitDetail() {
  const { pillarId, unitId } = useParams<{ pillarId: string; unitId: string }>();
  const pillar = getPillarById(pillarId || "");
  const { data: unit, isLoading: unitLoading } = useUnit(unitId);
  const { data: sessions = [], isLoading: sessionsLoading } = useUnitSessions(unitId);
  const { data: progressMap = {} } = useUserUnitProgress(unit ? [unit.id] : []);
  const { isAdmin, departmentRole } = useUserRole();

  if (unitLoading || sessionsLoading) {
    return (
      <div className="min-h-screen bg-cinematic-surface">
        <StickyNav />
        <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
          Loading unit…
        </div>
      </div>
    );
  }

  if (!pillar || !unit) return <Navigate to="/courses" replace />;

  const progress = progressMap[unit.id];
  const completedCount = progress?.sessions_completed ?? 0;
  const lastIndex = progress?.last_session_index ?? 0;
  const totalSessions = unit.session_count || sessions.length || 0;
  const pct = totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0;
  const nextSessionIndex = Math.min(completedCount + 1, Math.max(1, totalSessions));
  const hours = Math.max(1, Math.round(unit.estimated_minutes / 60));
  const canPreviewLocked = isAdmin || departmentRole === "ceo" || departmentRole === "curriculum";
  const theme = getPillarMotion(pillar.id);
  const civic = pillar.id === "civic-leadership";

  return (
    <div className="min-h-screen bg-cinematic-surface relative">
      <GoldParticles count={12} opacity={0.06} />
      <StickyNav />

      {/* Header */}
      <div
        className="text-white py-12 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${pillar.color}, ${pillar.color}cc)` }}
      >
        <div className="container mx-auto px-4 relative">
          <Button asChild variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 -ml-2 mb-4">
            <Link to={`/pillar/${pillar.id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {pillar.name}
            </Link>
          </Button>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-3xl">
              <Badge variant="outline" className="border-white/30 text-white/80 mb-3">
                Unit {unit.order_index} · {pillar.name}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3">{unit.title}</h1>
              {unit.description && (
                <p className="text-white/80 text-base md:text-lg">{unit.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-white/80">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> {totalSessions} sessions · ~{hours}h
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> {unit.total_xp} XP
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> {completedCount}/{totalSessions} complete
                </span>
              </div>
            </div>
            {totalSessions > 0 && (
              <Button
                asChild
                size="lg"
                className="font-semibold shadow-lg"
                style={{ background: civic ? "hsl(var(--premium))" : theme.color, color: civic ? "hsl(var(--primary))" : "hsl(var(--primary-foreground))" }}
              >
                <Link to={`/pillar/${pillar.id}/unit/${unit.id}/session/${nextSessionIndex}`}>
                  {completedCount === 0 ? "Start Session 1" : "Continue"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            )}
          </div>

          {/* Progress bar */}
          {totalSessions > 0 && (
            <div className="mt-6 max-w-xl">
              <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: civic ? "hsl(var(--premium))" : theme.color }} />
              </div>
              <p className="text-xs text-white/70 mt-1.5">{pct}% complete</p>
            </div>
          )}
        </div>
      </div>

      {/* Sessions list */}
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Sessions</h2>
            <p className="text-sm text-muted-foreground">
              Complete each session in sequence to unlock the next.
            </p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-60" />
              Sessions for this unit haven't been published yet. Check back soon.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((s, i) => {
              const oneBased = i + 1;
              const isCompleted = oneBased <= completedCount;
              const isCurrent = oneBased === completedCount + 1;
              const learnerLocked = oneBased > completedCount + 1;
              const isLocked = !canPreviewLocked && learnerLocked;

              return (
                <Card
                  key={s.id}
                  className={cn(
                    "transition-all",
                    isCurrent && "ring-2 shadow-md",
                    isLocked && "opacity-60",
                  )}
                  style={{
                    borderColor: civic ? "hsl(var(--premium))" : theme.color,
                    boxShadow: isCurrent ? `0 0 0 2px ${civic ? "hsl(var(--premium))" : theme.color}` : undefined,
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold",
                            isCompleted && "bg-emerald-500 text-white",
                            isCurrent && "text-primary-foreground",
                            isLocked && "bg-muted text-muted-foreground",
                            !isCompleted && !isCurrent && !isLocked && "bg-muted text-foreground",
                          )}
                          style={isCurrent ? { backgroundColor: civic ? "hsl(var(--primary))" : theme.color } : undefined}
                        >
                          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> :
                           isLocked ? <Lock className="w-4 h-4" /> :
                           oneBased}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                            Session {oneBased}
                          </p>
                          <CardTitle className="text-base leading-snug truncate">
                            {s.title}
                          </CardTitle>
                        </div>
                      </div>
                    </div>
                    {s.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{s.summary}</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      asChild
                      variant={isCurrent ? "default" : "outline"}
                      size="sm"
                      disabled={isLocked}
                      className={cn("w-full", isCurrent && "text-primary-foreground")}
                      style={isCurrent ? { backgroundColor: civic ? "hsl(var(--primary))" : theme.color } : undefined}
                    >
                      {isLocked ? (
                        <span className="inline-flex items-center justify-center">
                          <Lock className="w-4 h-4 mr-2" /> Locked
                        </span>
                      ) : (
                        <Link to={`/pillar/${pillar.id}/unit/${unit.id}/session/${oneBased}`}>
                          <PlayCircle className="w-4 h-4 mr-2" />
                           {isCompleted ? "Review" : learnerLocked && canPreviewLocked ? "Preview" : isCurrent ? "Start" : "Open"}
                        </Link>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}