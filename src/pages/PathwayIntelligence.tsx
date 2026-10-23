import { useState } from "react";
import StickyNav from "@/components/StickyNav";
import PathwayAssessment from "@/components/pathway/PathwayAssessment";
import AssessmentResult from "@/components/pathway/AssessmentResult";
import { computePIEResult, type PIEResult } from "@/data/pathwayIntelligence";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, TrendingUp, Monitor, Shield, Code, Video, Landmark,
  ArrowRight, Compass, Clock, Lock,
} from "lucide-react";

const pillarPreviews = [
  { icon: <Brain className="w-5 h-5" />, label: "Personal Mastery", color: "hsl(270, 60%, 55%)" },
  { icon: <TrendingUp className="w-5 h-5" />, label: "Financial Intelligence", color: "hsl(45, 100%, 55%)" },
  { icon: <Monitor className="w-5 h-5" />, label: "Digital Literacy", color: "hsl(180, 75%, 45%)" },
  { icon: <Shield className="w-5 h-5" />, label: "Cybersecurity", color: "hsl(0, 70%, 50%)" },
  { icon: <Code className="w-5 h-5" />, label: "Programming & AI", color: "hsl(210, 80%, 50%)" },
  { icon: <Video className="w-5 h-5" />, label: "Creator Economy", color: "hsl(330, 70%, 50%)" },
  { icon: <Landmark className="w-5 h-5" />, label: "Civic Leadership", color: "hsl(150, 60%, 40%)" },
];

const PathwayIntelligence = () => {
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<PIEResult | null>(null);

  const handleComplete = (answers: Record<string, Record<string, number>>) => {
    const pieResult = computePIEResult(answers);
    setResult(pieResult);
  };

  const handleRetake = () => {
    setStarted(false);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <StickyNav />

      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-4 bg-accent/20 text-accent border-accent/30">
            <Compass className="w-3 h-3 mr-1" />
            Cross-Pillar Diagnostic
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Genlink Pathway Intelligence Engine
          </h1>
          <p className="text-primary-foreground/70 max-w-2xl mx-auto">
            A master diagnostic that maps your psychology, aptitude, and ambition
            into a structured multi-year learning blueprint across all 7 pillars.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Landing State */}
        {!started && !result && (
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Pillar Icons Row */}
            <div className="flex justify-center gap-3 flex-wrap">
              {pillarPreviews.map((p) => (
                <div
                  key={p.label}
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-accent-foreground"
                  style={{ backgroundColor: p.color }}
                  title={p.label}
                >
                  {p.icon}
                </div>
              ))}
            </div>

            {/* What it measures */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-2xl font-bold text-foreground">40</p>
                <p className="text-xs text-muted-foreground">Scenario Questions</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-2xl font-bold text-foreground">9</p>
                <p className="text-xs text-muted-foreground">Diagnostic Dimensions</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-2xl font-bold text-foreground">3-Year</p>
                <p className="text-xs text-muted-foreground">Projected Roadmap</p>
              </div>
            </div>

            {/* Assessment Details */}
            <div className="bg-muted/30 rounded-xl p-6 border border-border space-y-4">
              <h3 className="font-semibold text-foreground">What This Assessment Measures</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  "Identity Orientation", "Economic Motivation", "Technical Aptitude",
                  "Leadership Inclination", "Civic Awareness", "Focus Capacity",
                  "Risk Appetite", "Ethical Decision Style", "Growth Commitment",
                ].map((dim) => (
                  <div key={dim} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {dim}
                  </div>
                ))}
              </div>
            </div>

            {/* What you get */}
            <div className="bg-muted/30 rounded-xl p-6 border border-border space-y-3">
              <h3 className="font-semibold text-foreground">What You'll Receive</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  Personalized archetype classification based on weighted cluster scoring
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  Cross-pillar learning roadmap with recommended tracks per pillar
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  3-year skill compounding projection with deep work structure
                </li>
                <li className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="italic">Full path matrix remains internal — only your recommended tracks are shown</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Estimated time: 20–30 minutes
            </div>

            <div className="text-center">
              <Button
                onClick={() => setStarted(true)}
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground px-8"
              >
                <Compass className="w-5 h-5 mr-2" />
                Begin Assessment
              </Button>
            </div>
          </div>
        )}

        {/* Assessment In Progress */}
        {started && !result && (
          <div className="max-w-2xl mx-auto">
            <PathwayAssessment onComplete={handleComplete} />
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="max-w-3xl mx-auto">
            <AssessmentResult result={result} onRetake={handleRetake} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PathwayIntelligence;
