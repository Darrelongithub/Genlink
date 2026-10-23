import { pieDimensions, type PIEResult } from "@/data/pathwayIntelligence";
import { pillars } from "@/data/courses";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  Brain, TrendingUp, Monitor, Shield, Code, Video, Landmark,
  ArrowRight, Target, Sparkles, RotateCcw, Eye, Clock,
  BookOpen, Zap,
} from "lucide-react";
import { useState } from "react";

const pillarIcons: Record<string, React.ReactNode> = {
  "personal-mastery": <Brain className="w-5 h-5" />,
  "financial-intelligence": <TrendingUp className="w-5 h-5" />,
  "digital-literacy": <Monitor className="w-5 h-5" />,
  "cybersecurity": <Shield className="w-5 h-5" />,
  "programming-systems": <Code className="w-5 h-5" />,
  "creator-economy": <Video className="w-5 h-5" />,
  "civic-leadership": <Landmark className="w-5 h-5" />,
};

interface PathwayResultsProps {
  result: PIEResult;
  onRetake: () => void;
}

const PathwayResults = ({ result, onRetake }: PathwayResultsProps) => {
  const { archetype, dimensionPercentages } = result;
  const [showTrajectory, setShowTrajectory] = useState(false);

  // Build visual roadmap from pillar mapping
  const roadmapSteps = [
    { pillarId: "personal-mastery", label: "Foundation", pathId: archetype.pillarMapping.pillar1Path, year: "Year 1" },
    { pillarId: "financial-intelligence", label: "Financial Track", pathId: archetype.pillarMapping.pillar2Path, year: "Year 1" },
    { pillarId: "digital-literacy", label: "Digital Track", pathId: archetype.pillarMapping.pillar3Path, year: "Year 1–2" },
    { pillarId: archetype.pillarMapping.specialization.split("→")[0]?.trim() || "programming-systems", label: "Specialization", pathId: archetype.pillarMapping.specialization, year: "Year 2–3" },
    { pillarId: "civic-leadership", label: "Civic Integration", pathId: archetype.pillarMapping.pillar7Integration, year: "Year 3" },
  ];

  // Find pillar data for each roadmap step
  const getPillar = (id: string) => pillars.find((p) => p.id === id);

  // Sort dimensions by score for display
  const sortedDimensions = [...pieDimensions].sort(
    (a, b) => (dimensionPercentages[b.id] || 0) - (dimensionPercentages[a.id] || 0)
  );

  return (
    <div className="space-y-8">
      {/* Archetype Result */}
      <Card className="border-accent/30 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-accent via-secondary to-accent" />
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-accent/10">
            <Target className="w-8 h-8 text-accent" />
          </div>
          <Badge className="mx-auto mb-2 bg-accent/10 text-accent border-accent/20 text-xs">
            Your Genlink Archetype
          </Badge>
          <CardTitle className="text-2xl md:text-3xl">{archetype.title}</CardTitle>
          <p className="text-sm italic text-muted-foreground mt-1">{archetype.tagline}</p>
          <CardDescription className="text-base mt-3 max-w-2xl mx-auto">
            {archetype.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Strengths */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Core Strengths
            </p>
            <div className="flex flex-wrap gap-2">
              {archetype.strengths.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs font-normal">
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          {/* Diagnostic Profile */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Diagnostic Profile
            </p>
            <div className="space-y-2">
              {sortedDimensions.map((dim) => (
                <div key={dim.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-36 text-right">{dim.label}</span>
                  <div className="flex-1">
                    <Progress value={dimensionPercentages[dim.id] || 0} className="h-2" />
                  </div>
                  <span className="text-xs text-muted-foreground w-10">
                    {dimensionPercentages[dim.id] || 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Your Recommended Learning Roadmap
          </CardTitle>
          <CardDescription>
            A structured cross-pillar pathway designed for your archetype
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {roadmapSteps.map((step, i) => {
                const pillar = getPillar(step.pillarId);
                return (
                  <div key={i} className="relative flex items-start gap-4 pl-2">
                    {/* Timeline dot */}
                    <div
                      className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-background"
                      style={{ backgroundColor: pillar?.color || "hsl(var(--accent))" }}
                    >
                      <span className="text-accent-foreground">
                        {pillarIcons[step.pillarId] || <BookOpen className="w-5 h-5" />}
                      </span>
                    </div>

                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {step.year}
                        </Badge>
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                          {step.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {pillar?.name || step.pillarId}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Recommended track: <span className="font-medium text-foreground">{step.pathId}</span>
                      </p>
                      {pillar && (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-7 text-xs text-accent hover:text-accent/80 p-0"
                        >
                          <Link to={`/pillar/${pillar.id}`}>
                            View Pillar <ArrowRight className="w-3 h-3 ml-1" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3-Year Projection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              Skill Compounding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {archetype.projectedTrajectory}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent" />
              Deep Work Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {archetype.deepWorkStructure}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              Economic Positioning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {archetype.economicPositioning}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Note */}
      <p className="text-xs text-muted-foreground text-center italic max-w-xl mx-auto">
        This blueprint reflects your current orientation — it is a compass, not a constraint.
        You may explore any pillar or path that resonates with your evolving goals.
        Re-assessment is available every 6 months.
      </p>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onRetake}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Retake Assessment
        </Button>
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link to="/courses">
            Explore Pillars
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default PathwayResults;
