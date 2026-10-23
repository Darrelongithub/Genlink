import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, ArrowRight, Lock, CheckCircle2, Target, Layers,
  Shield, TrendingUp, Briefcase, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileType } from "@/data/courses";

interface PathBranchMapProps {
  profileType: ProfileType | null;
  recommendedPathId: string | null;
  foundationCompleted?: boolean;
}

const paths = [
  {
    id: "identity-discipline-builder",
    title: "Identity & Discipline Builder",
    subtitle: "Deep inner work",
    description: "Master habits, self-regulation, and personal integrity. Build unshakeable discipline.",
    icon: <Target className="w-6 h-6" />,
    courseId: "identity-discipline",
    weeks: 10,
    role: "Discipline Coach",
    capstone: "Personal Transformation Portfolio",
  },
  {
    id: "leadership-psychology",
    title: "Leadership Psychology & Influence",
    subtitle: "Lead and inspire",
    description: "Master the psychology of leadership, persuasion, and ethical influence.",
    icon: <TrendingUp className="w-6 h-6" />,
    courseId: "leadership-psychology",
    weeks: 12,
    role: "Leadership Consultant",
    capstone: "Community Leadership Project",
  },
  {
    id: "high-performance-architect",
    title: "High-Performance Systems Architect",
    subtitle: "Optimize everything",
    description: "Design personal systems for peak performance and scalable productivity.",
    icon: <Layers className="w-6 h-6" />,
    courseId: "performance-architect",
    weeks: 10,
    role: "Performance Coach",
    capstone: "Personal Operating System v2.0",
  },
];

const PathBranchMap = ({ profileType, recommendedPathId, foundationCompleted }: PathBranchMapProps) => {
  return (
    <div className="space-y-6">
      {/* Foundation Node */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30">
          <Brain className="w-5 h-5 text-accent" />
          <span className="font-semibold text-sm text-foreground">Mind Architecture & Identity Design</span>
          {foundationCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-accent" />
          ) : (
            <Badge className="bg-accent text-accent-foreground text-xs">Required First</Badge>
          )}
        </div>
      </div>

      {/* Branch Lines */}
      <div className="flex justify-center">
        <div className="w-px h-8 bg-accent/30" />
      </div>
      <div className="flex justify-center">
        <div className="flex items-center gap-8 md:gap-16">
          <div className="w-16 md:w-24 h-px bg-accent/30" />
          <div className="w-px h-4 bg-accent/30" />
          <div className="w-16 md:w-24 h-px bg-accent/30" />
        </div>
      </div>

      {/* Path Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {paths.map((path) => {
          const isRecommended = path.id === recommendedPathId;
          return (
            <Card
              key={path.id}
              className={cn(
                "transition-all duration-300 relative",
                isRecommended
                  ? "border-accent shadow-lg ring-2 ring-accent/20"
                  : "border-border hover:border-accent/50 hover:shadow-md"
              )}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground text-xs shadow-sm">
                    <Star className="w-3 h-3 mr-1" /> Recommended
                  </Badge>
                </div>
              )}
              <CardContent className="p-5 space-y-4 pt-6">
                <div className="flex items-center gap-2 text-accent">
                  {path.icon}
                  <h4 className="font-bold text-sm text-foreground">{path.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground">{path.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Briefcase className="w-3 h-3 mr-1" />
                    {path.role}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {path.weeks} weeks
                  </Badge>
                </div>

                <div className="bg-muted rounded p-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Capstone:</span> {path.capstone}
                </div>

                <Button
                  asChild={foundationCompleted}
                  disabled={!foundationCompleted}
                  className={cn(
                    "w-full text-sm",
                    foundationCompleted
                      ? "bg-accent hover:bg-accent/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {foundationCompleted ? (
                    <Link to={`/learn/${path.courseId}`}>
                      Start Path <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Complete Foundation First
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PathBranchMap;
