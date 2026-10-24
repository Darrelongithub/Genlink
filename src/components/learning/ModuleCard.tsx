import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Module, UserProgress } from "@/hooks/useUserProgress";
import { 
  Play, 
  CheckCircle2, 
  Lock, 
  Clock, 
  Zap, 
  Gamepad2, 
  GripVertical, 
  Target,
  Code,
  Video
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  module: Module;
  progress?: UserProgress;
  isLocked?: boolean;
  onClick: () => void;
  index: number;
}

const getExerciseIcon = (type: string) => {
  switch (type) {
    case "simulation":
      return <Target className="w-4 h-4" />;
    case "drag_drop":
      return <GripVertical className="w-4 h-4" />;
    case "scenario_game":
      return <Gamepad2 className="w-4 h-4" />;
    case "sandbox":
      return <Code className="w-4 h-4" />;
    case "video":
      return <Video className="w-4 h-4" />;
    default:
      return <Play className="w-4 h-4" />;
  }
};

const getExerciseLabel = (type: string) => {
  switch (type) {
    case "simulation":
      return "Interactive Simulation";
    case "drag_drop":
      return "Drag & Drop Exercise";
    case "scenario_game":
      return "Decision Game";
    case "sandbox":
      return "Practice Sandbox";
    case "video":
      return "Video Lesson";
    default:
      return "Interactive";
  }
};

const ModuleCard = ({ module, progress, isLocked, onClick, index }: ModuleCardProps) => {
  const isCompleted = progress?.completed;
  const isPremium = module.module_type === "premium";
  const exerciseType = (module.content as { type?: string })?.type || "video";

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer group",
        isCompleted && "border-accent/50 bg-accent/5",
        isLocked && "opacity-60 cursor-not-allowed",
        isPremium && !isLocked && "border-premium/30"
      )}
      onClick={!isLocked ? onClick : undefined}
    >
      {/* Module number indicator */}
      <div className={cn(
        "absolute top-0 left-0 w-10 h-10 flex items-center justify-center text-sm font-bold",
        isCompleted 
          ? "bg-accent text-accent-foreground" 
          : isPremium 
            ? "bg-premium text-premium-foreground"
            : "bg-muted text-muted-foreground"
      )}>
        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : index}
      </div>

      <CardHeader className="pl-14 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg group-hover:text-accent transition-colors">
              {module.title}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {module.description}
            </CardDescription>
          </div>
          {isPremium && (
            <Badge className="bg-premium text-premium-foreground border-0 shrink-0">
              {isLocked ? <Lock className="w-3 h-3 mr-1" /> : null}
              Premium
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pl-14 space-y-4">
        {/* Exercise type and metadata */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {getExerciseIcon(exerciseType)}
            <span>{getExerciseLabel(exerciseType)}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{module.estimated_minutes} min</span>
          </div>
          <div className="flex items-center gap-1 text-accent font-medium">
            <Zap className="w-4 h-4" />
            <span>+{module.xp_reward} XP</span>
          </div>
        </div>

        {/* Progress or action button */}
        {isCompleted ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-accent">
              <CheckCircle2 className="w-4 h-4" />
              <span>Completed</span>
            </div>
            <Button variant="outline" size="sm" className="group-hover:bg-accent/10">
              Review
            </Button>
          </div>
        ) : isLocked ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Enroll to unlock
            </p>
            <Button size="sm" className="bg-premium hover:bg-premium/90 text-premium-foreground">
              Enroll
            </Button>
          </div>
        ) : (
          <Button 
            size="sm" 
            className="w-full bg-accent hover:bg-accent/90 group-hover:shadow-md transition-all"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Module
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ModuleCard;
