import { Progress } from "@/components/ui/progress";
import { useUserXP, levelProgress, xpToNextLevel, calculateLevel } from "@/hooks/useUserProgress";
import { Flame, Star, Zap } from "lucide-react";

const XPBar = () => {
  const { data: userXP, isLoading } = useUserXP();

  if (isLoading || !userXP) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-muted rounded w-full"></div>
      </div>
    );
  }

  const level = calculateLevel(userXP.total_xp);
  const progress = levelProgress(userXP.total_xp);
  const xpNeeded = xpToNextLevel(userXP.total_xp);

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
              <Star className="w-6 h-6 text-accent-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-premium text-premium-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
              {level}
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">Level {level}</p>
            <p className="text-sm text-muted-foreground">{userXP.total_xp.toLocaleString()} XP total</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {userXP.streak_days > 0 && (
            <div className="flex items-center gap-1 text-premium">
              <Flame className="w-5 h-5" />
              <span className="font-bold">{userXP.streak_days}</span>
              <span className="text-xs text-muted-foreground">day streak</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress to Level {level + 1}</span>
          <span>{xpNeeded} XP to go</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Zap className="w-4 h-4 text-accent" />
        <span>Complete modules to earn XP and level up!</span>
      </div>
    </div>
  );
};

export default XPBar;
