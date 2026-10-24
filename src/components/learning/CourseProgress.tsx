import { Progress } from "@/components/ui/progress";
import { Module, UserProgress } from "@/hooks/useUserProgress";
import { CheckCircle2, BookOpen, Trophy } from "lucide-react";

interface CourseProgressProps {
  modules: Module[];
  progress: UserProgress[];
  courseName: string;
}

const CourseProgress = ({ modules, progress, courseName }: CourseProgressProps) => {
  const freeModules = modules.filter(m => m.module_type === "free");
  const completedModules = progress.filter(p => p.completed);
  const completedFreeModules = completedModules.filter(p => 
    freeModules.some(m => m.id === p.module_id)
  );

  const totalXPEarned = completedModules.reduce((sum, p) => {
    const module = modules.find(m => m.id === p.module_id);
    return sum + (module?.xp_reward || 0);
  }, 0);

  const progressPercent = freeModules.length > 0 
    ? (completedFreeModules.length / freeModules.length) * 100 
    : 0;

  const allFreeCompleted = completedFreeModules.length === freeModules.length;

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg text-foreground">{courseName}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {completedFreeModules.length} of {freeModules.length} free modules completed
          </p>
        </div>
        {allFreeCompleted && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 text-accent rounded-full text-sm font-medium">
            <Trophy className="w-4 h-4" />
            Fundamentals Complete!
          </div>
        )}
      </div>

      {/* Progress bar with milestones */}
      <div className="space-y-2">
        <div className="relative">
          <Progress value={progressPercent} className="h-3" />
          {/* Milestone markers */}
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-between px-1 pointer-events-none">
            {freeModules.map((_, index) => {
              const position = ((index + 1) / freeModules.length) * 100;
              const isCompleted = index < completedFreeModules.length;
              return (
                <div
                  key={index}
                  className="absolute transform -translate-x-1/2"
                  style={{ left: `${position}%` }}
                >
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    isCompleted 
                      ? "bg-accent border-accent" 
                      : "bg-background border-muted-foreground/30"
                  }`}>
                    {isCompleted && (
                      <CheckCircle2 className="w-3 h-3 text-accent-foreground m-0.5" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Start</span>
          <span>{Math.round(progressPercent)}% Complete</span>
          <span>Free Fundamentals</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <BookOpen className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-xl font-bold text-foreground">{completedFreeModules.length}</p>
          <p className="text-xs text-muted-foreground">Modules Done</p>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <Trophy className="w-5 h-5 mx-auto text-premium mb-1" />
          <p className="text-xl font-bold text-foreground">{totalXPEarned}</p>
          <p className="text-xs text-muted-foreground">XP Earned</p>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <CheckCircle2 className="w-5 h-5 mx-auto text-accent mb-1" />
          <p className="text-xl font-bold text-foreground">{Math.round(progressPercent)}%</p>
          <p className="text-xs text-muted-foreground">Progress</p>
        </div>
      </div>

      {/* Upgrade CTA if all free modules completed */}
      {allFreeCompleted && (
        <div className="bg-gradient-to-r from-premium/10 to-accent/10 border border-premium/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-foreground">Ready for Premium? 🚀</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Unlock advanced modules, projects, and certificates
              </p>
            </div>
            <button className="px-4 py-2 bg-premium hover:bg-premium/90 text-premium-foreground rounded-lg font-medium transition-colors">
              Upgrade Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseProgress;
