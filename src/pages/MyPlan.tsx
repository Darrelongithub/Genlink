import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import StickyNav from "@/components/StickyNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Circle, Compass, Sparkles, AlertTriangle } from "lucide-react";
import { GoldParticles, Reveal } from "@/components/motion";
import { pillars } from "@/data/courses";
import { usePillarUnits, useUserUnitProgress } from "@/hooks/useUnits";
import { useLearningPlan, useGenerateLearningPlan } from "@/hooks/useLearningPlan";

const MyPlan = () => {
  const navigate = useNavigate();
  const { data: plan, isLoading } = useLearningPlan();
  const generate = useGenerateLearningPlan();

  // Auto-build the plan on first visit so the learner never sees an empty page.
  useEffect(() => {
    if (!isLoading && !plan && !generate.isPending && !generate.isSuccess) {
      generate.mutate();
    }
  }, [isLoading, plan, generate]);

  const pillar = pillars.find((p) => p.id === plan?.pillar_id);
  const { data: units = [] } = usePillarUnits(plan?.pillar_id);
  const { data: progressMap = {} } = useUserUnitProgress(units.map((u) => u.id));

  const ordered = (plan?.unit_order ?? [])
    .map((id) => units.find((u) => u.id === id))
    .filter((u) => u && u.status === "live") as typeof units;

  const isDone = (unitId: string, sessionCount: number) =>
    (progressMap[unitId]?.sessions_completed ?? 0) >= sessionCount && sessionCount > 0;

  const nextStepIndex = ordered.findIndex((u) => !isDone(u.id, u.session_count));
  const nextUnit = nextStepIndex >= 0 ? ordered[nextStepIndex] : undefined;
  const completedCount = ordered.filter((u) => isDone(u.id, u.session_count)).length;
  const pct = ordered.length ? Math.round((completedCount / ordered.length) * 100) : 0;

  // Off-plan detection: progress recorded on a unit outside the plan sequence.
  const offPlanUnit = units.find(
    (u) =>
      !(plan?.unit_order ?? []).includes(u.id) &&
      (progressMap[u.id]?.sessions_completed ?? 0) > 0,
  );

  return (
    <div className="min-h-screen bg-cinematic-surface relative">
      <GoldParticles count={14} opacity={0.08} />
      <StickyNav />

      <main className="container mx-auto px-4 pt-28 pb-20 max-w-3xl">
        <Reveal>
          <div className="space-y-2 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs text-accent font-medium">Your personalised plan</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {pillar ? pillar.name : "Building your plan…"}
            </h1>
            {plan?.reasoning && (
              <p className="text-muted-foreground leading-relaxed">{plan.reasoning}</p>
            )}
          </div>
        </Reveal>

        {/* Continue Learning */}
        {nextUnit && (
          <Reveal>
            <div className="rounded-2xl border border-accent/30 bg-card p-6 mb-8 shadow-lg">
              <p className="text-xs uppercase tracking-wider text-accent font-semibold mb-1">
                Continue learning
              </p>
              <h2 className="text-xl font-semibold text-foreground mb-1">{nextUnit.title}</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Step {nextStepIndex + 1} of {ordered.length} · {nextUnit.session_count} sessions ·{" "}
                {nextUnit.total_xp} XP
              </p>
              <Button
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => navigate(`/pillar/${plan!.pillar_id}/unit/${nextUnit.id}`)}
              >
                Resume <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Reveal>
        )}

        {!nextUnit && ordered.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 mb-8">
            <p className="font-semibold text-foreground mb-1">Plan complete</p>
            <p className="text-sm text-muted-foreground mb-4">
              You've finished every unit in this pillar. Explore another on the journey map.
            </p>
            <Button asChild variant="outline">
              <Link to="/journey">
                <Compass className="w-4 h-4 mr-2" /> Journey map
              </Link>
            </Button>
          </div>
        )}

        {/* Off-plan banner */}
        {offPlanUnit && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 mb-8 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">You're working off-plan</p>
              <p className="text-muted-foreground">
                Progress recorded on <span className="font-medium">{offPlanUnit.title}</span>, which
                sits outside your sequence. That's fine — your plan stays here whenever you want to
                return to it.
              </p>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {ordered.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>
                {completedCount} of {ordered.length} units complete
              </span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-slow"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Ordered steps */}
        <ol className="space-y-3">
          {ordered.map((u, i) => {
            const done = isDone(u.id, u.session_count);
            const current = nextUnit?.id === u.id;
            return (
              <li key={u.id}>
                <Link
                  to={`/pillar/${plan!.pillar_id}/unit/${u.id}`}
                  className={`flex items-start gap-3 rounded-xl border p-4 bg-card transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    current ? "border-accent/50 ring-1 ring-accent/30" : "border-border"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Step {i + 1}</span>
                      {current && (
                        <Badge className="bg-accent text-accent-foreground text-[10px]">Next up</Badge>
                      )}
                    </div>
                    <p className="font-medium text-foreground leading-tight">{u.title}</p>
                    {u.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{u.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{u.total_xp} XP</span>
                </Link>
              </li>
            );
          })}
        </ol>

        {ordered.length === 0 && !isLoading && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground mb-4">
              No units are published for this pillar yet. Take the Pathway Assessment to refine your
              plan, or browse the journey map.
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link to="/pathway-intelligence">Take the assessment</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/journey">Journey map</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyPlan;
