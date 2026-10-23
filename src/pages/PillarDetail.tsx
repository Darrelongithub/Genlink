import { useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import StickyNav from "@/components/StickyNav";
import { getPillarById } from "@/data/courses";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, TrendingUp, Monitor, Shield, Code, Video, Landmark,
  ArrowRight, Target, Users, CheckCircle2, ArrowLeft,
} from "lucide-react";
import { GoldParticles } from "@/components/motion";
import { cn } from "@/lib/utils";
import { usePillarUnits, useUserUnitProgress } from "@/hooks/useUnits";
import UnitCard from "@/components/learning/UnitCard";
import SpecializedUnitCard from "@/components/learning/SpecializedUnitCard";
import PillarHeader, { type PillarTheme, pillarThemes } from "@/components/learning/PillarHeader";
import PillarLearningView from "@/components/learning/PillarLearningView";
import { useAuth } from "@/contexts/AuthContext";
import { usePillarEnrollment, useHasAssessment, enrollInPillar } from "@/hooks/usePillarEnrollment";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { usePillarAccess } from "@/hooks/usePillarAccess";
import LockedPillar from "@/components/learning/LockedPillar";

const pillarIcons: Record<string, React.ReactNode> = {
  brain: <Brain className="w-8 h-8" />,
  "trending-up": <TrendingUp className="w-8 h-8" />,
  monitor: <Monitor className="w-8 h-8" />,
  shield: <Shield className="w-8 h-8" />,
  code: <Code className="w-8 h-8" />,
  video: <Video className="w-8 h-8" />,
  landmark: <Landmark className="w-8 h-8" />,
};

const PillarDetail = () => {
  const { pillarId } = useParams<{ pillarId: string }>();
  const pillar = getPillarById(pillarId || "");
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: isEnrolled = false, isLoading: enrollmentLoading } = usePillarEnrollment(pillarId);
  const { data: userHasAssessment = false } = useHasAssessment();

  const { data: access } = usePillarAccess();
  const pillarAccess = access?.find((a) => a.pillar_id === pillarId);
  const isLocked = pillarAccess?.state === "locked";

  const { data: units = [] } = usePillarUnits(pillarId);
  const learningPathUnits = units.filter((u) => u.track_type === "learning_path");
  const specializedUnits = units.filter((u) => u.track_type === "specialized");
  const { data: progressMap = {} } = useUserUnitProgress(units.map((u) => u.id));

  // FIX 4: if the learner already has the master pathway assessment, auto-enrol
  // silently when they land on a pillar — no second questionnaire.
  useEffect(() => {
    if (!user || !pillar) return;
    if (isEnrolled || enrollmentLoading) return;
    if (!userHasAssessment) return;
    // Never auto-enrol into a locked pillar (the server would refuse anyway).
    if (!pillarAccess || pillarAccess.state !== "open") return;
    enrollInPillar(user.id, pillar.id).then(() => {
      queryClient.invalidateQueries({ queryKey: ["pillar_enrollment", user.id, pillar.id] });
    });
  }, [user, pillar, isEnrolled, enrollmentLoading, userHasAssessment, queryClient, pillarAccess]);

  if (!pillar) return <Navigate to="/courses" replace />;

  const iconEl = pillarIcons[pillar.icon];

  const handleEnrol = async () => {
    if (!user) {
      // Anonymous → assessment first (which captures lead + creates account)
      navigate("/pathway-intelligence");
      return;
    }
    if (!userHasAssessment) {
      navigate("/pathway-intelligence");
      return;
    }
    const { error } = await enrollInPillar(user.id, pillar.id);
    if (error) {
      toast.error(error.message ?? "Could not enrol. Please try again.");
      return;
    }
    toast.success(`You're enrolled in ${pillar.name}.`);
    queryClient.invalidateQueries({ queryKey: ["pillar_enrollment", user.id, pillar.id] });
  };

  // ── LOCKED (and not enrolled) → friendly locked screen with requirements + preview
  if (pillarAccess && isLocked && !isEnrolled && !(user && enrollmentLoading)) {
    return (
      <div className="min-h-screen bg-cinematic-surface relative">
        <GoldParticles count={14} opacity={0.06} />
        <StickyNav />
        <LockedPillar access={pillarAccess} color={pillar.color} />
      </div>
    );
  }

  // ── AUTHENTICATED + ENROLLED → learning view ──────────────────
  if (user && isEnrolled) {
    return (
      <div className="min-h-screen bg-cinematic-surface relative">
        <GoldParticles count={14} opacity={0.06} />
        <StickyNav />
        <div className="container mx-auto px-4 py-8">
          <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground">
            <Link to="/journey">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Journey
            </Link>
          </Button>
          <PillarLearningView pillar={pillar} icon={iconEl} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinematic-surface relative">
      <GoldParticles count={14} opacity={0.06} />
      <StickyNav />

      {/* Themed Pillar Header */}
      <PillarHeader
        theme={(pillar.id as PillarTheme) in pillarThemes ? (pillar.id as PillarTheme) : "personal-mastery"}
        title={pillar.name}
        tagline={pillar.tagline}
        icon={pillarIcons[pillar.icon]}
      >
        <Button asChild variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 -ml-2 mb-3">
          <Link to="/courses">
            <ArrowLeft className="w-4 h-4 mr-2" />
            All Pillars
          </Link>
        </Button>
        <p className="text-lg text-white/80 max-w-3xl">{pillar.description}</p>
      </PillarHeader>

      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* Overview Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" />
                Purpose
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{pillar.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                Who It's For
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{pillar.whoIsItFor}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                Core Competencies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {pillar.coreCompetencies.map((comp) => (
                  <li key={comp} className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-accent mt-1 flex-shrink-0" />
                    {comp}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Learning Paths — always visible; the master pathway assessment
            (Layer 1) is the single diagnostic. No secondary questionnaire. */}
        {true && (
          <>
            {/* Compare Paths Toggle */}
            {/* Learning Paths as a navigation concept has been removed.
                The pillar's 7-unit sequence below IS the primary structure. */}

            {/* Learning Path Units — primary track */}
            {learningPathUnits.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">Learning Path</h2>
                  <p className="text-sm text-muted-foreground">The 7-unit core curriculum for this pillar.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {learningPathUnits.map((unit) => {
                    const prog = progressMap[unit.id];
                    const completed = prog?.sessions_completed ?? 0;
                    const prevUnit = learningPathUnits.find((u) => u.order_index === unit.order_index - 1);
                    const prevDone = !prevUnit || (progressMap[prevUnit.id]?.sessions_completed ?? 0) >= prevUnit.session_count;
                    let state: "locked" | "current" | "completed" | "available";
                    if (completed >= unit.session_count && unit.session_count > 0) state = "completed";
                    else if (unit.order_index === 1 || prevDone) state = completed > 0 ? "current" : (prevDone ? "current" : "available");
                    else state = "locked";
                    return (
                      <UnitCard key={unit.id} unit={unit} progress={prog} state={state} pillarId={pillar.id} />
                    );
                  })}
                </div>
              </div>
            )}



        {/* Units Section */}
        {specializedUnits.length > 0 && (
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-muted-foreground">Bonus & Deep Dives</h3>
              <p className="text-xs text-muted-foreground">Optional enrichment — not part of the core path.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {specializedUnits.map((unit) => (
                <SpecializedUnitCard key={unit.id} unit={unit} pillarId={pillar.id} />
              ))}
            </div>
          </div>
        )}
          </>
        )}

        {/* Enrol CTA — visible to unauthenticated visitors and signed-in-but-not-enrolled users */}
        <div className="pt-6">
          <div
            className="rounded-2xl p-8 md:p-10 text-center relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${pillar.color}18, hsl(var(--accent) / 0.08))`,
              border: `1px solid ${pillar.color}40`,
            }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white mx-auto mb-4"
              style={{ backgroundColor: pillar.color }}
            >
              {iconEl}
            </div>
            <h3 className="text-2xl md:text-3xl font-bold mb-2">Ready to begin {pillar.name}?</h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6">
              {user
                ? userHasAssessment
                  ? "You're all set — enrol to unlock the 7 units, XP tracking and mentor access."
                  : "Complete the Pathway Intelligence assessment first — it makes sure this pillar is the right starting point for you."
                : "Start with the Pathway Intelligence assessment. You'll get a personalised profile, then unlock this pillar."}
            </p>
            <Button
              onClick={handleEnrol}
              disabled={enrollmentLoading}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-md"
            >
              {user && userHasAssessment ? "Enrol in this Pillar" : "Enrol in this Pillar"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            {!user && (
              <p className="text-xs text-muted-foreground mt-3">
                Already have an account?{" "}
                <Link to="/auth" className="text-accent hover:underline">
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PillarDetail;
