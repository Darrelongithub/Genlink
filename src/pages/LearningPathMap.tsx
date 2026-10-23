import { useState } from "react";
import { Link } from "react-router-dom";
import StickyNav from "@/components/StickyNav";
import { pillars, courses, progressionLevels, type Pillar, type LearningPath, type ProgressionLevel } from "@/data/courses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Brain, TrendingUp, Monitor, Shield, Code, Video, Landmark,
  Target, ArrowRight, CheckCircle2, Clock, Star, ChevronDown, ChevronUp,
  Layers, GraduationCap, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

const pillarIcons: Record<string, React.ReactNode> = {
  brain: <Brain className="w-6 h-6" />,
  "trending-up": <TrendingUp className="w-6 h-6" />,
  monitor: <Monitor className="w-6 h-6" />,
  shield: <Shield className="w-6 h-6" />,
  code: <Code className="w-6 h-6" />,
  video: <Video className="w-6 h-6" />,
  landmark: <Landmark className="w-6 h-6" />,
};

type SkillLevel = "beginner" | "intermediate" | "advanced";

const skillLabels: Record<SkillLevel, string> = {
  beginner: "I'm just starting out",
  intermediate: "I have some experience",
  advanced: "I'm looking to specialize",
};

const LearningPathMap = () => {
  const [selectedPillar, setSelectedPillar] = useState<Pillar | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillLevel | null>(null);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  const filteredPaths = selectedPillar?.learningPaths.filter(
    (p) => !selectedSkill || p.skillLevel === selectedSkill
  ) ?? [];

  const allPaths = selectedSkill
    ? pillars.flatMap(p => p.learningPaths.filter(lp => lp.skillLevel === selectedSkill))
    : [];

  const displayPaths = selectedPillar ? filteredPaths : allPaths;

  const resetSelection = () => {
    setSelectedPillar(null);
    setSelectedSkill(null);
    setExpandedPath(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <StickyNav />

      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30 mb-4">
            <Target className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Cisco NetAcad–Style Paths</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Learning Path Map</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Choose your goal, assess your level, and follow a structured path to mastery
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-12">

        {/* Step 1: Select Your Goal (Pillar) */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">1</div>
            <h2 className="text-xl font-bold">Select Your Goal Area</h2>
            {selectedPillar && (
              <Button variant="ghost" size="sm" onClick={resetSelection} className="ml-auto text-muted-foreground">
                Reset
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((pillar) => {
              const isSelected = selectedPillar?.id === pillar.id;
              return (
                <button
                  key={pillar.id}
                  onClick={() => {
                    setSelectedPillar(isSelected ? null : pillar);
                    setExpandedPath(null);
                  }}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-lg",
                    isSelected
                      ? "border-accent bg-accent/10 shadow-md"
                      : "border-border hover:border-accent/50 bg-card"
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-accent">{pillarIcons[pillar.icon]}</div>
                    <span className="font-semibold text-sm text-foreground">{pillar.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{pillar.tagline}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {pillar.learningPaths.length} paths available
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: Current Skill Level */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">2</div>
            <h2 className="text-xl font-bold">Your Current Skill Level</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            {(Object.keys(skillLabels) as SkillLevel[]).map((level) => (
              <Button
                key={level}
                variant={selectedSkill === level ? "default" : "outline"}
                onClick={() => setSelectedSkill(selectedSkill === level ? null : level)}
                className={cn(
                  "transition-all",
                  selectedSkill === level && "bg-accent hover:bg-accent/90 shadow-md"
                )}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)} — {skillLabels[level]}
              </Button>
            ))}
          </div>
        </section>

        {/* Step 3: Recommended Paths */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">3</div>
            <h2 className="text-xl font-bold">
              {selectedPillar ? `Paths in ${selectedPillar.name}` : selectedSkill ? `All ${selectedSkill} paths` : "Select a goal or skill level to see paths"}
            </h2>
          </div>

          {displayPaths.length === 0 && (selectedPillar || selectedSkill) && (
            <p className="text-muted-foreground">No paths match your selection. Try a different combination.</p>
          )}

          {!selectedPillar && !selectedSkill && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pillars.map((pillar) => (
                <Card key={pillar.id} className="border-border hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-accent">{pillarIcons[pillar.icon]}</div>
                      <CardTitle className="text-lg">{pillar.name}</CardTitle>
                    </div>
                    <CardDescription>{pillar.tagline}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {pillar.learningPaths.map((path) => (
                        <li key={path.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="w-3 h-3 text-accent flex-shrink-0" />
                          {path.title}
                          <Badge variant="outline" className="text-xs ml-auto">{path.skillLevel}</Badge>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => setSelectedPillar(pillar)}
                    >
                      Explore Paths
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {displayPaths.map((path) => {
              const course = courses.find(c => path.courseIds.includes(c.id));
              const isExpanded = expandedPath === path.id;
              const pillar = pillars.find(p => p.learningPaths.some(lp => lp.id === path.id));

              return (
                <Card key={path.id} className={cn("transition-all", isExpanded && "shadow-lg border-accent/50")}>
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedPath(isExpanded ? null : path.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-accent">{pillar && pillarIcons[pillar.icon]}</div>
                          <div>
                            <CardTitle className="text-lg">{path.title}</CardTitle>
                            <CardDescription className="mt-1">{path.description}</CardDescription>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="outline" className="text-xs">
                          <Briefcase className="w-3 h-3 mr-1" />
                          {path.targetRole}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {path.estimatedWeeks} weeks
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          <Layers className="w-3 h-3 mr-1" />
                          {path.skillLevel}
                        </Badge>
                      </div>
                    </CardHeader>
                  </button>

                  {isExpanded && course && (
                    <CardContent className="space-y-6 border-t pt-6">
                      {/* Progression Levels */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-accent" />
                          Progression Levels
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {(Object.entries(progressionLevels) as [ProgressionLevel, typeof progressionLevels[ProgressionLevel]][]).map(([key, level], i) => (
                            <div key={key} className={cn(
                              "p-3 rounded-lg border text-center",
                              level.isFree ? "bg-accent/10 border-accent/30" : "bg-muted border-border"
                            )}>
                              <p className="font-semibold text-sm">{level.label}</p>
                              <p className="text-xs text-muted-foreground mt-1">{level.description}</p>
                              {level.isFree && <Badge className="mt-2 bg-accent text-accent-foreground text-xs">Free</Badge>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 5-Layer Structure */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-accent" />
                          5-Layer Course Structure
                        </h4>
                        <div className="space-y-3">
                          {course.layers.map((layer, i) => (
                            <div key={layer.id} className="flex gap-4 items-start">
                              <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm flex-shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{layer.name}</p>
                                <p className="text-xs text-muted-foreground">{layer.description}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {layer.modules.map((mod, j) => (
                                    <Badge key={j} variant="outline" className="text-xs font-normal">{mod}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Capstone */}
                      {path.capstoneProject && (
                        <div className="bg-premium/10 border border-premium/30 rounded-lg p-4">
                          <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4 text-premium" />
                            Capstone Project
                          </h4>
                          <p className="text-sm text-muted-foreground">{path.capstoneProject}</p>
                        </div>
                      )}

                      {/* CTA */}
                      <div className="flex gap-3">
                        <Button asChild className="bg-accent hover:bg-accent/90">
                          <Link to={`/learn/${course.id}`}>
                            Start Foundation (Free)
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default LearningPathMap;
