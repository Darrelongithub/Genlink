import { useParams, Link, Navigate } from "react-router-dom";
import StickyNav from "@/components/StickyNav";
import { getPathById, courses, progressionLevels, type ProgressionLevel } from "@/data/courses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Clock, Target, Layers, GraduationCap,
  CheckCircle2, Star, Briefcase, BookOpen, Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PathDetail = () => {
  const { pillarId, pathId } = useParams<{ pillarId: string; pathId: string }>();
  const result = getPathById(pathId || "");

  if (!result) return <Navigate to="/courses" replace />;

  const { path, pillar } = result;
  const pathCourses = courses.filter((c) => path.courseIds.includes(c.id));
  const primaryCourse = pathCourses[pathCourses.length - 1] || pathCourses[0];

  return (
    <div className="min-h-screen bg-background">
      <StickyNav />

      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="flex gap-3 mb-4">
            <Button asChild variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground">
              <Link to="/courses">
                <ArrowLeft className="w-4 h-4 mr-1" />
                All Pillars
              </Link>
            </Button>
            <span className="text-primary-foreground/40">→</span>
            <Button asChild variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground">
              <Link to={`/pillar/${pillar.id}`}>{pillar.name}</Link>
            </Button>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">{path.title}</h1>
          <p className="text-lg text-primary-foreground/80 max-w-3xl mb-4">{path.description}</p>

          <div className="flex flex-wrap gap-3">
            <Badge className="bg-accent/20 text-accent border border-accent/30 capitalize">
              <Layers className="w-3 h-3 mr-1" />
              {path.skillLevel}
            </Badge>
            <Badge className="bg-accent/20 text-accent border border-accent/30">
              <Clock className="w-3 h-3 mr-1" />
              {path.estimatedWeeks} weeks
            </Badge>
            <Badge className="bg-accent/20 text-accent border border-accent/30">
              <Briefcase className="w-3 h-3 mr-1" />
              {path.targetRole}
            </Badge>
            {path.certificationTier && (
              <Badge className="bg-premium/20 text-premium border border-premium/30">
                <GraduationCap className="w-3 h-3 mr-1" />
                {path.certificationTier} Certification
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-10">
        {/* Career Outcomes */}
        {path.careerOutcomes && path.careerOutcomes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                Career Outcome Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {path.careerOutcomes.map((outcome) => (
                  <div key={outcome} className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <Briefcase className="w-4 h-4 text-accent flex-shrink-0" />
                    <span className="text-sm font-medium">{outcome}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Competency Milestones */}
        {path.competencyMilestones && path.competencyMilestones.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                Competency Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {path.competencyMilestones.map((milestone, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm">{milestone}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Required Foundation */}
        {path.requiredFoundation && (
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="w-5 h-5 text-accent" />
                Required Foundation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{path.requiredFoundation}</p>
            </CardContent>
          </Card>
        )}

        {/* Progression Roadmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-accent" />
              Progression Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.entries(progressionLevels) as [ProgressionLevel, typeof progressionLevels[ProgressionLevel]][]).map(
                ([key, level]) => (
                  <div
                    key={key}
                    className={cn(
                      "p-4 rounded-lg border text-center transition-all",
                      level.isFree ? "bg-accent/10 border-accent/30" : "bg-muted border-border",
                      path.certificationTier?.toLowerCase() === key && "ring-2 ring-accent shadow-md"
                    )}
                  >
                    <p className="font-semibold text-sm">{level.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{level.description}</p>
                    {level.isFree && (
                      <Badge className="mt-2 bg-accent text-accent-foreground text-xs">Free</Badge>
                    )}
                    {path.certificationTier?.toLowerCase() === key && (
                      <Badge className="mt-2 bg-premium text-premium-foreground text-xs">Your Target</Badge>
                    )}
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* 5-Layer Structure */}
        {primaryCourse && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" />
                5-Layer Course Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {primaryCourse.layers.map((layer, i) => (
                  <div key={layer.id} className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{layer.name}</p>
                      <p className="text-sm text-muted-foreground mb-2">{layer.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {layer.modules.map((mod, j) => (
                          <Badge key={j} variant="outline" className="text-xs font-normal">
                            {mod}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Capstone */}
        {path.capstoneProject && (
          <Card className="border-premium/30 bg-premium/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-premium" />
                Capstone Project Requirement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{path.capstoneProject}</p>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-6">
          {primaryCourse && (
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link to={`/learn/${primaryCourse.id}`}>
                <Play className="w-5 h-5 mr-2" />
                Start Learning — Foundation (Free)
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="lg">
            <Link to={`/pillar/${pillar.id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {pillar.name}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PathDetail;
