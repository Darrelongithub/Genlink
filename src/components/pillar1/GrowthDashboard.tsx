import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Brain, Shield, TrendingUp, Target, Calendar } from "lucide-react";
import { useUserXP } from "@/hooks/useUserProgress";

const GrowthDashboard = () => {
  const { data: userXP } = useUserXP();

  const streakDays = userXP?.streak_days || 0;
  // Simulated scores based on XP (would be DB-backed in production)
  const totalXP = userXP?.total_xp || 0;
  const cognitiveResilience = Math.min(100, Math.round((totalXP / 2000) * 100));
  const habitConsistency = Math.min(100, Math.round((streakDays / 30) * 100));
  const ethicalClarity = Math.min(100, Math.round((totalXP / 1500) * 100));

  const metrics = [
    {
      label: "Habit Streak",
      value: `${streakDays} days`,
      score: habitConsistency,
      icon: <Flame className="w-5 h-5" />,
      color: "text-premium",
      description: "Consecutive days of learning activity",
    },
    {
      label: "Cognitive Resilience",
      value: `${cognitiveResilience}%`,
      score: cognitiveResilience,
      icon: <Brain className="w-5 h-5" />,
      color: "text-accent",
      description: "Your ability to think clearly under pressure",
    },
    {
      label: "Ethical Clarity",
      value: `${ethicalClarity}%`,
      score: ethicalClarity,
      icon: <Shield className="w-5 h-5" />,
      color: "text-secondary",
      description: "Decision quality in ethical simulations",
    },
    {
      label: "Growth Trajectory",
      value: totalXP > 500 ? "Accelerating" : totalXP > 100 ? "Building" : "Starting",
      score: Math.min(100, Math.round((totalXP / 1000) * 100)),
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-accent",
      description: "Your overall development momentum",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-5 h-5 text-accent" />
        <h3 className="font-bold text-lg text-foreground">Personal Growth Dashboard</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={metric.color}>{metric.icon}</div>
                  <span className="font-semibold text-sm text-foreground">{metric.label}</span>
                </div>
                <Badge variant="outline" className="text-xs font-bold">{metric.value}</Badge>
              </div>
              <Progress value={metric.score} className="h-2" />
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Focus */}
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-accent" />
            <span className="font-semibold text-sm text-foreground">This Week's Focus</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {streakDays >= 7
              ? "Outstanding consistency! Focus on deepening your ethical decision-making practice."
              : streakDays >= 3
              ? "Good momentum — maintain your daily practice and complete one ethical simulation."
              : "Start building your streak. Commit to 15 minutes of intentional learning today."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GrowthDashboard;
