import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import StickyNav from "@/components/StickyNav";
import ProgressMap from "@/components/ProgressMap";
import TrendingPicks from "@/components/TrendingPicks";
import QuickQuiz from "@/components/QuickQuiz";
import WhySection from "@/components/WhySection";
import Newsletter from "@/components/Newsletter";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import { pillars } from "@/data/courses";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GoldParticles, Reveal } from "@/components/motion";
import { enrollInPillar } from "@/hooks/usePillarEnrollment";
import {
  Sparkles, Brain, TrendingUp, Monitor, Shield, Code, Video, Landmark, ArrowRight, Star,
} from "lucide-react";

const pillarIcons: Record<string, React.ReactNode> = {
  brain: <Brain className="w-6 h-6" />,
  "trending-up": <TrendingUp className="w-6 h-6" />,
  monitor: <Monitor className="w-6 h-6" />,
  shield: <Shield className="w-6 h-6" />,
  code: <Code className="w-6 h-6" />,
  video: <Video className="w-6 h-6" />,
  landmark: <Landmark className="w-6 h-6" />,
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const recommendedId = searchParams.get("recommended");
  const { user } = useAuth();
  const navigate = useNavigate();

  // On first authenticated arrival, persist any pending assessment snapshot.
  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem("genlink_pending_assessment");
    (async () => {
      if (raw) {
      try {
        const snapshot = JSON.parse(raw);
        const { error } = await supabase.from("assessment_results").insert({
          user_id: user.id,
          ...snapshot,
        });
        if (error) throw error;
        localStorage.removeItem("genlink_pending_assessment");
        toast.success("Your pathway profile is saved.");
      } catch (err) {
        console.error("Failed to persist assessment result:", err);
      }
      }

      // FIX 3: on the very first authenticated arrival, if the learner has
      // a recommended pillar from the pathway assessment, auto-enrol them and
      // land them straight inside that pillar (Session 1 ready).
      const firstLoginKey = `genlink_first_pillar_redirect_${user.id}`;
      if (localStorage.getItem(firstLoginKey)) return;
      try {
        const { data: ar } = await supabase
          .from("assessment_results")
          .select("primary_pillar_recommended")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!ar) return;
        // Never auto-enrol into a locked pillar: land on the first OPEN pillar's next session.
        const { data: access } = await (supabase as any).rpc("get_pillar_access");
        const open = ((access ?? []) as { pillar_id: string; state: string; enrolled: boolean }[])
          .filter((a) => a.state === "open");
        const target = open.find((a) => a.pillar_id === ar.primary_pillar_recommended) ?? open[0];
        if (!target) return;
        if (!target.enrolled) await enrollInPillar(user.id, target.pillar_id);
        const { data: units } = await supabase
          .from("units").select("id, order_index, session_count")
          .eq("pillar_id", target.pillar_id).eq("track_type", "learning_path").order("order_index");
        const { data: prog } = await supabase
          .from("user_unit_progress").select("unit_id, sessions_completed").eq("user_id", user.id);
        const done = new Map((prog ?? []).map((p) => [p.unit_id, p.sessions_completed]));
        const next = (units ?? []).find((u) => (done.get(u.id) ?? 0) < u.session_count) ?? units?.[0];
        localStorage.setItem(firstLoginKey, "1");
        navigate(next
          ? `/pillar/${target.pillar_id}/unit/${next.id}/session/${(done.get(next.id) ?? 0) + 1}`
          : `/pillar/${target.pillar_id}`, { replace: true });
      } catch (err) {
        console.warn("First-pillar redirect skipped:", err);
      }
    })();
  }, [user, navigate]);

  return (
    <div className="min-h-screen scroll-smooth relative bg-cinematic-surface">
      <GoldParticles count={16} opacity={0.07} />
      <StickyNav />
      <ProgressMap />
      
      {/* Social Proof - Trending Picks */}
      <TrendingPicks />

      {/* Quick Quiz for Personalization */}
      <QuickQuiz />

      {/* Pillars Preview Section */}
      <section id="courses" className="py-20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm text-accent font-medium">7 Core Pillars of Mastery</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Explore Our Learning Pillars
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Each pillar contains structured learning paths with Foundation (Free) through Elite levels
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {pillars.map((pillar, i) => (
              <Link
                key={pillar.id}
                to={`/pillar/${pillar.id}`}
                className={`group relative p-5 rounded-xl border bg-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in ${
                  recommendedId === pillar.id
                    ? "border-accent ring-2 ring-accent/40 shadow-lg"
                    : "border-border"
                }`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {recommendedId === pillar.id && (
                  <Badge className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-[10px] px-2 py-0.5 shadow-md">
                    <Star className="w-3 h-3 mr-1" />
                    Recommended for you
                  </Badge>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-accent-foreground"
                    style={{ backgroundColor: pillar.color }}
                  >
                    {pillarIcons[pillar.icon]}
                  </div>
                  <h3 className="font-semibold text-sm text-foreground group-hover:text-accent transition-colors leading-tight">
                    {pillar.name}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{pillar.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {pillar.learningPaths.length} paths
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link to="/courses">
                View All Pillars & Paths
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <WhySection />
      <Newsletter />

      <footer className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4">
            <p className="text-lg font-medium">Genlink Hub — Linking Generations</p>
            <p className="text-sm text-primary-foreground/70">&copy; 2025 Genlink Hub. All rights reserved.</p>
            <p className="text-xs text-primary-foreground/50">Proudly serving learners across Kenya 🇰🇪</p>
          </div>
        </div>
      </footer>

      {/* Exit Intent Popup */}
      <ExitIntentPopup />
    </div>
  );
};

export default Index;
