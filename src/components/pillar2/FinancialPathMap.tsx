import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, ArrowRight, Lock, CheckCircle2, Shield,
  TrendingUp, Briefcase, Star, Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinancialProfileType } from "@/data/courses";

interface FinancialPathMapProps {
  profileType: FinancialProfileType | null;
  recommendedPathId: string | null;
  foundationCompleted?: boolean;
}

const paths = [
  {
    id: "personal-finance-stability",
    title: "Personal Finance & Stability Architect",
    subtitle: "Build bulletproof stability",
    description: "Master budget systems, emergency funds, debt management, insurance literacy, and savings automation.",
    icon: <Shield className="w-6 h-6" />,
    courseId: "personal-finance-stability",
    weeks: 10,
    role: "Financial Stability Coach",
    capstone: "12-Month Personal Financial Stability Blueprint",
  },
  {
    id: "investor-market-intelligence",
    title: "Investor & Market Intelligence Builder",
    subtitle: "Analyze and invest wisely",
    description: "Understand asset classes, NSE & global markets, portfolio diversification, and risk-adjusted returns.",
    icon: <TrendingUp className="w-6 h-6" />,
    courseId: "investor-market-intelligence",
    weeks: 12,
    role: "Investment Analyst",
    capstone: "Simulated Diversified Portfolio Strategy",
  },
  {
    id: "income-systems-enterprise",
    title: "Income Systems & Digital Enterprise Architect",
    subtitle: "Build income engines",
    description: "Design business models, revenue systems, unit economics, cashflow management, and digital income streams.",
    icon: <Landmark className="w-6 h-6" />,
    courseId: "income-systems-enterprise",
    weeks: 12,
    role: "Digital Enterprise Architect",
    capstone: "Monetizable Income System Blueprint",
  },
];

const FinancialPathMap = ({ profileType, recommendedPathId, foundationCompleted }: FinancialPathMapProps) => {
  return (
    <div className="space-y-6">
      {/* Foundation Node */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30">
          <DollarSign className="w-5 h-5 text-accent" />
          <span className="font-semibold text-sm text-foreground">Money Psychology & Wealth Thinking</span>
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

export default FinancialPathMap;
