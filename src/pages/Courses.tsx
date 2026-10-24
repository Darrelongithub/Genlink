import { Link } from "react-router-dom";
import StickyNav from "@/components/StickyNav";
import { pillars } from "@/data/courses";
import { usePillarAccess, previewHref } from "@/hooks/usePillarAccess";
import { Progress } from "@/components/ui/progress";
import { Lock, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, TrendingUp, Monitor, Shield, Code, Video, Landmark,
  ArrowRight, GraduationCap, Sparkles, Compass,
} from "lucide-react";

const pillarIcons: Record<string, React.ReactNode> = {
  brain: <Brain className="w-8 h-8" />,
  "trending-up": <TrendingUp className="w-8 h-8" />,
  monitor: <Monitor className="w-8 h-8" />,
  shield: <Shield className="w-8 h-8" />,
  code: <Code className="w-8 h-8" />,
  video: <Video className="w-8 h-8" />,
  landmark: <Landmark className="w-8 h-8" />,
};

const Courses = () => {
  const { data: access } = usePillarAccess();
  return (
    <div className="min-h-screen bg-background">
      <StickyNav />

      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30 mb-4">
            <GraduationCap className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">7 Core Pillars of Mastery</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Explore Our Learning Pillars</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Each pillar is a structured domain with goal-oriented learning paths. Select a pillar to discover available paths.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* Pathway Intelligence CTA */}
        <Card className="border-accent/30 bg-gradient-to-r from-accent/5 to-transparent overflow-hidden">
          <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-6">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Compass className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-semibold text-foreground">Not sure where to start?</p>
              <p className="text-sm text-muted-foreground">
                Take the Pathway Intelligence Assessment — a cross-pillar diagnostic that generates your personalized multi-year learning blueprint.
              </p>
            </div>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground flex-shrink-0">
              <Link to="/pathway-intelligence">
                <Compass className="w-4 h-4 mr-2" />
                Start Assessment
              </Link>
            </Button>
          </CardContent>
        </Card>

        {[
          { key: "foundation", title: "Foundation", sub: "Three compulsory pillars, taken in order. Everything else builds on these." },
          { key: "specialisation", title: "Choose your path", sub: "Four specialisations. Pick any once the Foundation is built." },
        ].map((group) => (
          <section key={group.key} className="space-y-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">{group.title}</h2>
              <p className="text-sm text-muted-foreground">{group.sub}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pillars
                .map((pillar) => ({ pillar, a: access?.find((x) => x.pillar_id === pillar.id) }))
                .filter(({ a }) => (a?.track ?? "") === group.key)
                .sort((x, y) => (x.a!.order_index - y.a!.order_index))
                .map(({ pillar, a }, index) => {
                  const locked = a!.state === "locked";
                  return (
            <Card
              key={pillar.id}
              className={`group overflow-hidden transition-all duration-300 border-border animate-fade-in ${locked ? "opacity-60" : "hover:shadow-2xl hover:-translate-y-2"}`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4 mb-3">
                  <div
                    className="relative w-14 h-14 rounded-xl flex items-center justify-center text-accent-foreground"
                    style={{ backgroundColor: pillar.color }}
                  >
                    {pillarIcons[pillar.icon]}
                    {group.key === "foundation" && (
                      <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center shadow">
                        {a!.order_index}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl group-hover:text-accent transition-colors flex items-center gap-2">
                      {locked && <Lock className="w-4 h-4 text-muted-foreground" />}
                      {pillar.name}
                    </CardTitle>
                    <CardDescription className="text-xs italic">{pillar.tagline}</CardDescription>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                {locked ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">To unlock</p>
                    {a!.requirements.map((r) => (
                      <div key={r.pillar_id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Pillar {r.order_index}: {r.current_pct}%</span>
                          <span className="text-muted-foreground">needs {r.required_pct}%</span>
                        </div>
                        <Progress value={Math.min(100, (r.current_pct / Math.max(1, r.required_pct)) * 100)} className="h-1.5 bg-muted [&>div]:bg-accent" />
                      </div>
                    ))}
                    <Button asChild variant="outline" className="w-full">
                      <Link to={previewHref(a!)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview first session
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Focus Areas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {pillar.focusAreas.slice(0, 4).map((area) => (
                          <Badge key={area} variant="outline" className="text-xs font-normal">{area}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                      <Link to={`/pillar/${pillar.id}`}>
                        {a!.enrolled ? "Continue" : "Explore & Enrol"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default Courses;
