import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  Target, 
  Home, 
  Utensils, 
  Car, 
  Smartphone, 
  Wallet, 
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BudgetCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  recommended: { min: number; max: number };
  color: string;
}

interface BudgetSimulatorProps {
  title: string;
  description: string;
  monthlyIncome: number;
  xpReward: number;
  onComplete: (score: number) => void;
}

const categories: BudgetCategory[] = [
  { id: "housing", name: "Housing & Rent", icon: <Home className="w-4 h-4" />, recommended: { min: 25, max: 35 }, color: "bg-blue-500" },
  { id: "food", name: "Food & Groceries", icon: <Utensils className="w-4 h-4" />, recommended: { min: 10, max: 15 }, color: "bg-green-500" },
  { id: "transport", name: "Transport", icon: <Car className="w-4 h-4" />, recommended: { min: 5, max: 15 }, color: "bg-yellow-500" },
  { id: "utilities", name: "Utilities & Phone", icon: <Smartphone className="w-4 h-4" />, recommended: { min: 5, max: 10 }, color: "bg-purple-500" },
  { id: "savings", name: "Savings", icon: <PiggyBank className="w-4 h-4" />, recommended: { min: 20, max: 30 }, color: "bg-accent" },
  { id: "personal", name: "Personal & Fun", icon: <Wallet className="w-4 h-4" />, recommended: { min: 5, max: 10 }, color: "bg-pink-500" },
];

const BudgetSimulator = ({
  title,
  description,
  monthlyIncome,
  xpReward,
  onComplete,
}: BudgetSimulatorProps) => {
  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    categories.forEach(cat => {
      initial[cat.id] = cat.recommended.min;
    });
    return initial;
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const totalAllocated = useMemo(() => 
    Object.values(allocations).reduce((sum, val) => sum + val, 0)
  , [allocations]);

  const remainingPercent = 100 - totalAllocated;

  const handleSliderChange = (categoryId: string, value: number[]) => {
    setAllocations(prev => ({ ...prev, [categoryId]: value[0] }));
  };

  const getAmountForCategory = (percent: number) => {
    return Math.round((percent / 100) * monthlyIncome);
  };

  const evaluateBudget = () => {
    let score = 0;
    let feedback: { category: string; status: "good" | "warning" | "danger"; message: string }[] = [];

    categories.forEach(cat => {
      const allocated = allocations[cat.id];
      if (allocated >= cat.recommended.min && allocated <= cat.recommended.max) {
        score += 15;
        feedback.push({ category: cat.name, status: "good", message: "Well allocated!" });
      } else if (allocated < cat.recommended.min) {
        score += 5;
        feedback.push({ category: cat.name, status: "warning", message: `Consider increasing (recommended ${cat.recommended.min}-${cat.recommended.max}%)` });
      } else {
        score += 8;
        feedback.push({ category: cat.name, status: "warning", message: `Consider reducing (recommended ${cat.recommended.min}-${cat.recommended.max}%)` });
      }
    });

    // Bonus for savings being 20%+
    if (allocations.savings >= 20) {
      score += 10;
    }

    // Penalty for not allocating 100%
    if (remainingPercent !== 0) {
      score -= Math.abs(remainingPercent) * 2;
    }

    return { score: Math.max(0, Math.min(100, score)), feedback };
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    const { score } = evaluateBudget();
    if (score >= 70) {
      onComplete(score);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    const initial: Record<string, number> = {};
    categories.forEach(cat => {
      initial[cat.id] = cat.recommended.min;
    });
    setAllocations(initial);
  };

  const { score, feedback } = evaluateBudget();
  const passed = score >= 70;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-accent" />
              {title}
            </CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-accent" />
            +{xpReward} XP
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Income display */}
        <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Monthly Income</p>
            <p className="text-2xl font-bold text-foreground">Ksh {monthlyIncome.toLocaleString()}</p>
          </div>
          <div className={cn(
            "text-right",
            remainingPercent === 0 ? "text-accent" : remainingPercent > 0 ? "text-premium" : "text-destructive"
          )}>
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className="text-xl font-bold">{remainingPercent}%</p>
          </div>
        </div>

        {/* Category sliders */}
        <div className="space-y-6">
          {categories.map(category => {
            const allocated = allocations[category.id];
            const amount = getAmountForCategory(allocated);
            const isInRange = allocated >= category.recommended.min && allocated <= category.recommended.max;

            return (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-lg", category.color, "text-white")}>
                      {category.icon}
                    </div>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-lg">{allocated}%</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      (Ksh {amount.toLocaleString()})
                    </span>
                  </div>
                </div>
                <Slider
                  value={[allocated]}
                  onValueChange={(value) => handleSliderChange(category.id, value)}
                  max={50}
                  min={0}
                  step={1}
                  disabled={isSubmitted}
                  className={cn(
                    isSubmitted && isInRange && "[&_[role=slider]]:bg-accent",
                    isSubmitted && !isInRange && "[&_[role=slider]]:bg-premium"
                  )}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded",
                    isInRange ? "bg-accent/20 text-accent" : "bg-muted"
                  )}>
                    Recommended: {category.recommended.min}-{category.recommended.max}%
                  </span>
                  <span>50%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Total Allocation</span>
            <span className={cn(
              "font-bold",
              totalAllocated === 100 ? "text-accent" : totalAllocated > 100 ? "text-destructive" : "text-premium"
            )}>
              {totalAllocated}%
            </span>
          </div>
          <Progress 
            value={Math.min(totalAllocated, 100)} 
            className={cn(
              "h-3",
              totalAllocated > 100 && "[&>div]:bg-destructive"
            )}
          />
          {totalAllocated !== 100 && (
            <p className={cn(
              "text-sm flex items-center gap-1",
              totalAllocated > 100 ? "text-destructive" : "text-premium"
            )}>
              <AlertTriangle className="w-4 h-4" />
              {totalAllocated > 100 
                ? `You're ${totalAllocated - 100}% over budget!`
                : `Allocate remaining ${remainingPercent}% to complete your budget`
              }
            </p>
          )}
        </div>

        {/* Results */}
        {isSubmitted && (
          <div className={cn(
            "p-4 rounded-lg space-y-4",
            passed ? "bg-accent/10 border border-accent/30" : "bg-muted"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {passed ? (
                  <CheckCircle2 className="w-6 h-6 text-accent" />
                ) : (
                  <TrendingUp className="w-6 h-6 text-premium" />
                )}
                <div>
                  <p className="font-semibold">{passed ? "Great Budget!" : "Good Start!"}</p>
                  <p className="text-sm text-muted-foreground">Score: {score}%</p>
                </div>
              </div>
              {passed && (
                <Badge className="bg-accent text-accent-foreground">
                  +{xpReward} XP Earned!
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {feedback.map((item, i) => (
                <div key={i} className="text-xs flex items-center gap-1">
                  {item.status === "good" ? (
                    <CheckCircle2 className="w-3 h-3 text-accent" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-premium" />
                  )}
                  <span className="text-muted-foreground">{item.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!isSubmitted ? (
            <Button 
              onClick={handleSubmit} 
              disabled={totalAllocated > 100}
              className="flex-1 bg-accent hover:bg-accent/90"
            >
              Submit Budget
            </Button>
          ) : (
            <Button onClick={handleReset} variant="outline" className="flex-1">
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetSimulator;
