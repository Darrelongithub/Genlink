import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import StickyNav from "@/components/StickyNav";
import Hero from "@/components/Hero";
import WhySection from "@/components/WhySection";
import Newsletter from "@/components/Newsletter";
import { Button } from "@/components/ui/button";
import { pillars } from "@/data/courses";
import { ArrowRight, Compass, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";

/**
 * Layer 1 — public marketing surface.
 * Anonymous visitors land here. CTA routes them through the Pathway
 * Intelligence Engine (diagnostic), which then prompts account creation
 * and redirects to /journey (Layer 2).
 */
const MarketingHome = () => {
  const { user } = useAuth();
  const { tier, loading } = useUserRole();
  const { hash } = useLocation();

  // Landing on "/#section" directly (e.g. from another page) scrolls to it.
  useEffect(() => {
    if (!hash) return;
    const t = window.setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => window.clearTimeout(t);
  }, [hash]);

  // Route "/" is Layer 1 for guests. Authenticated visitors are routed to
  // their appropriate surface: students -> /journey, team -> /dashboard.
  if (!loading && user) {
    if (tier === "team") return <Navigate to="/ops-dashboard" replace />;
    if (tier === "student") return <Navigate to="/journey" replace />;
  }

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      <StickyNav />
      <Hero />

      {/* Primary CTA strip: Pathway Intelligence Engine */}
      <section id="how-it-works" className="py-16 bg-gradient-to-br from-[#1B2A4A] to-[#0F1B33] text-white scroll-mt-20">
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/40 text-[#C9A84C]">
            <Compass className="w-4 h-4" />
            <span className="text-sm font-medium">Begin with the Pathway Intelligence Engine</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">
            Discover the discipline you're built for.
          </h2>
          <p className="text-lg text-white/75 max-w-2xl mx-auto">
            A 35–50 question diagnostic across the seven pillars maps your cognitive style,
            risk orientation and motivation profile — and shows the exact starting point that
            compounds fastest for you.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button asChild size="lg" className="bg-[#C9A84C] text-[#0F1B33] hover:bg-[#C9A84C]/90">
              <Link to="/pathway-intelligence">
                Take the diagnostic <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            {user ? (
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link to="/journey">Go to my journey</Link>
              </Button>
            ) : (
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link to="/auth">I already have an account</Link>
              </Button>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-white/50 pt-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            No payment required. Your results are saved when you create an account.
          </div>
        </div>
      </section>

      <WhySection />

      {/* Pillars preview */}
      <section id="pillars-preview" className="py-20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm text-accent font-medium">7 Core Pillars of Mastery</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">The Curriculum</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Seven disciplines. One coherent path. Sequenced so each pillar reinforces the next.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {pillars.map((p) => (
              <Link
                key={p.id}
                to={`/pillar/${p.id}`}
                className="group p-6 rounded-xl border bg-card hover:border-accent transition-all hover:-translate-y-1"
              >
                <div
                  className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0)}
                </div>
                <h3 className="text-lg font-semibold mb-1 group-hover:text-accent transition-colors">{p.name}</h3>
                <p className="text-sm text-muted-foreground italic mb-3">{p.tagline}</p>
                <span className="text-xs text-accent inline-flex items-center gap-1">
                  Explore <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Newsletter />
    </div>
  );
};

export default MarketingHome;