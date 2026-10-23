import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const scenarios = [
  {
    id: "s1",
    title: "The Windfall Decision",
    situation: "You receive an unexpected Ksh 500,000. Your friend says to invest it all in a 'guaranteed' crypto opportunity. Your financial advisor suggests splitting it: 40% emergency fund, 30% index fund, 30% business seed capital.",
    options: [
      { label: "All in crypto — high risk, high reward", value: "crypto", isEthical: false, feedback: "This is gambling, not investing. No investment is 'guaranteed.' You'd be risking your entire windfall on speculation." },
      { label: "Follow the advisor's diversification plan", value: "diversify", isEthical: true, feedback: "Excellent. Diversification protects your capital while still allowing growth. This is disciplined wealth building." },
      { label: "Put everything in a savings account", value: "save-all", isEthical: false, feedback: "While safe, inflation erodes savings over time. A portion should be invested for growth. Balance is key." },
      { label: "Spend it — you deserve a reward", value: "spend", isEthical: false, feedback: "Immediate gratification thinking. Wealth is built by making your money work, not by consuming it." },
    ],
  },
  {
    id: "s2",
    title: "The Business Pressure",
    situation: "Your new business is 3 months old. A supplier offers you a bulk deal that would use 80% of your operating capital. The deal expires in 24 hours.",
    options: [
      { label: "Take the deal — fear of missing out", value: "fomo", isEthical: false, feedback: "FOMO-driven decisions destroy businesses. You'd be over-leveraged with no cash buffer for emergencies." },
      { label: "Negotiate for a smaller quantity at similar pricing", value: "negotiate", isEthical: true, feedback: "Smart. You preserve cashflow while still capturing value. This is how disciplined entrepreneurs think." },
      { label: "Borrow money to cover the full deal", value: "borrow", isEthical: false, feedback: "Taking debt for speculative bulk purchases in a 3-month-old business is extremely risky. Cash is survival." },
      { label: "Pass on the deal entirely", value: "pass", isEthical: false, feedback: "Not wrong, but overly cautious. Negotiating a smaller deal would have been the best middle ground." },
    ],
  },
  {
    id: "s3",
    title: "The Market Panic",
    situation: "Your investment portfolio drops 15% in one week due to global market turbulence. Your social media feed is full of people selling everything.",
    options: [
      { label: "Sell everything immediately to cut losses", value: "panic-sell", isEthical: false, feedback: "Panic selling locks in losses. Markets are cyclical — disciplined investors stay the course and may even buy the dip." },
      { label: "Review your portfolio, rebalance if needed, hold steady", value: "review-hold", isEthical: true, feedback: "This is investor discipline. Review fundamentals, rebalance if allocations shifted, but don't react to noise." },
      { label: "Invest more — buy the dip aggressively", value: "buy-dip", isEthical: false, feedback: "Buying the dip can work, but doing it aggressively without analysis is speculation, not strategy." },
      { label: "Ignore it completely and don't check again", value: "ignore", isEthical: false, feedback: "Awareness matters. Ignoring your portfolio entirely means you might miss genuinely important signals." },
    ],
  },
];

const FinancialSimulation = () => {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [scores, setScores] = useState<boolean[]>([]);

  const scenario = scenarios[currentScenario];
  const selected = scenario.options.find(o => o.value === selectedOption);

  const handleSubmit = () => {
    if (!selectedOption || !selected) return;
    setShowFeedback(true);
    setScores(prev => [...prev, selected.isEthical]);
  };

  const handleNext = () => {
    setSelectedOption(null);
    setShowFeedback(false);
    if (currentScenario < scenarios.length - 1) {
      setCurrentScenario(prev => prev + 1);
    }
  };

  const isComplete = scores.length === scenarios.length && showFeedback && currentScenario === scenarios.length - 1;
  const correctCount = scores.filter(Boolean).length;
  const clarityScore = Math.round((correctCount / scenarios.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          Scenario {currentScenario + 1} of {scenarios.length}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Financial Clarity Score: {scores.length > 0 ? `${clarityScore}%` : "—"}
        </span>
      </div>
      <Progress value={(currentScenario / scenarios.length) * 100} className="h-2" />

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">{scenario.title}</CardTitle>
          <CardDescription className="text-sm">{scenario.situation}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {scenario.options.map((option) => (
            <button
              key={option.value}
              onClick={() => !showFeedback && setSelectedOption(option.value)}
              disabled={showFeedback}
              className={cn(
                "w-full text-left p-4 rounded-lg border-2 transition-all duration-200",
                showFeedback && option.value === selectedOption
                  ? option.isEthical
                    ? "border-green-500 bg-green-500/10"
                    : "border-red-500 bg-red-500/10"
                  : showFeedback && option.isEthical
                  ? "border-green-500/30 bg-green-500/5"
                  : selectedOption === option.value
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/50",
                showFeedback && "cursor-default"
              )}
            >
              <div className="flex items-center gap-3">
                {showFeedback && option.value === selectedOption && (
                  option.isEthical
                    ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-foreground">{option.label}</span>
              </div>
            </button>
          ))}

          {showFeedback && selected && (
            <div className={cn(
              "p-4 rounded-lg text-sm mt-4",
              selected.isEthical ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"
            )}>
              <p className="font-medium text-foreground mb-1">
                {selected.isEthical ? "✓ Disciplined Choice" : "✗ Risky Thinking"}
              </p>
              <p className="text-muted-foreground">{selected.feedback}</p>
            </div>
          )}

          {!showFeedback ? (
            <Button onClick={handleSubmit} disabled={!selectedOption} className="w-full mt-4 bg-accent hover:bg-accent/90">
              Submit Decision
            </Button>
          ) : !isComplete ? (
            <Button onClick={handleNext} className="w-full mt-4 bg-accent hover:bg-accent/90">
              Next Scenario <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <div className="text-center mt-4 space-y-2">
              <p className="text-lg font-bold text-foreground">
                Financial Clarity Score: {clarityScore}%
              </p>
              <p className="text-sm text-muted-foreground">
                {clarityScore >= 70 ? "Strong financial discipline — you think before you act." : "Keep building your financial judgment. Discipline is a muscle."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSimulation;
