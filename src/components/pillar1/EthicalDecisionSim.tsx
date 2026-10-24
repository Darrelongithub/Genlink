import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowRight, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Scenario {
  id: string;
  title: string;
  situation: string;
  options: { label: string; outcome: string; score: number }[];
}

const scenarios: Scenario[] = [
  {
    id: "s1",
    title: "The Shortcut Temptation",
    situation: "You discover an AI tool that can generate your entire assignment. Your deadline is tomorrow. You haven't started. What do you do?",
    options: [
      { label: "Use AI to generate the full assignment and submit it as your own", outcome: "Short-term relief, long-term skill deficit. You learn nothing and build dependence.", score: 10 },
      { label: "Use AI to outline ideas, but write every word yourself", outcome: "Smart tool use. You leverage AI for structure while maintaining cognitive ownership.", score: 90 },
      { label: "Ignore AI entirely and rush through manually", outcome: "Admirable independence, but refusing useful tools limits your effectiveness.", score: 60 },
      { label: "Ask for a deadline extension and do proper research", outcome: "Honest and strategic. You prioritize quality and integrity over speed.", score: 85 },
    ],
  },
  {
    id: "s2",
    title: "The Influence Dilemma",
    situation: "You've learned persuasion techniques. A friend asks you to help convince their community group to support a project that benefits your friend financially but may not serve the community's real needs.",
    options: [
      { label: "Help your friend — they'd do the same for you", outcome: "Loyalty without ethics. Using influence for personal gain erodes trust.", score: 20 },
      { label: "Refuse entirely and distance yourself", outcome: "Principled, but you miss a chance to redirect toward genuine value.", score: 50 },
      { label: "Help them reframe the project to genuinely serve both parties", outcome: "Ethical influence at its best — aligning interests for mutual benefit.", score: 95 },
      { label: "Publicly call out the conflict of interest", outcome: "Brave, but confrontation without alternatives often destroys relationships without solving problems.", score: 40 },
    ],
  },
  {
    id: "s3",
    title: "The Data Privacy Choice",
    situation: "You're building a community app. Collecting detailed personal data would make the app more useful, but your users are not tech-savvy and may not understand the privacy implications.",
    options: [
      { label: "Collect everything — more data means better service", outcome: "Effective but exploitative. Informed consent matters, especially with vulnerable users.", score: 15 },
      { label: "Collect minimal data and explain every permission clearly", outcome: "Ethical by design. You build trust and demonstrate responsible technology use.", score: 95 },
      { label: "Don't collect any data to avoid complications", outcome: "Safe, but your app may fail to deliver value. Balance is key.", score: 55 },
      { label: "Let users choose what to share with clear opt-in toggles", outcome: "User empowerment at its best — respect autonomy while enabling functionality.", score: 90 },
    ],
  },
];

const EthicalDecisionSim = () => {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showOutcome, setShowOutcome] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const scenario = scenarios[currentScenario];

  const handleSelect = (index: number) => {
    if (showOutcome) return;
    setSelectedOption(index);
  };

  const handleReveal = () => {
    if (selectedOption === null) return;
    setShowOutcome(true);
    setTotalScore(prev => prev + scenario.options[selectedOption].score);
  };

  const handleNext = () => {
    if (currentScenario < scenarios.length - 1) {
      setCurrentScenario(prev => prev + 1);
      setSelectedOption(null);
      setShowOutcome(false);
    } else {
      setCompleted(true);
    }
  };

  const handleReset = () => {
    setCurrentScenario(0);
    setSelectedOption(null);
    setShowOutcome(false);
    setTotalScore(0);
    setCompleted(false);
  };

  if (completed) {
    const avgScore = Math.round(totalScore / scenarios.length);
    return (
      <Card className="border-accent/30">
        <CardContent className="p-6 text-center space-y-4">
          <Shield className="w-12 h-12 text-accent mx-auto" />
          <h3 className="font-bold text-xl text-foreground">Simulation Complete</h3>
          <div className="text-4xl font-bold text-accent">{avgScore}%</div>
          <p className="text-sm text-muted-foreground">Ethical Clarity Score</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {avgScore >= 80
              ? "Strong ethical reasoning. You balance pragmatism with integrity."
              : avgScore >= 50
              ? "Developing ethical awareness. Keep reflecting on the long-term impact of your choices."
              : "Room for growth. Ethical decision-making is a muscle — keep practicing."}
          </p>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" /> Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-accent" />
          <Badge variant="outline" className="text-xs">
            Scenario {currentScenario + 1} of {scenarios.length}
          </Badge>
        </div>
        <CardTitle className="text-lg">{scenario.title}</CardTitle>
        <CardDescription>{scenario.situation}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {scenario.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            disabled={showOutcome}
            className={cn(
              "w-full text-left p-4 rounded-lg border-2 transition-all",
              showOutcome && selectedOption === i
                ? option.score >= 80
                  ? "border-accent bg-accent/10"
                  : option.score >= 50
                  ? "border-premium bg-premium/10"
                  : "border-destructive bg-destructive/10"
                : selectedOption === i
                ? "border-accent bg-accent/5"
                : "border-border hover:border-accent/50",
              showOutcome && "cursor-default"
            )}
          >
            <span className="text-sm font-medium text-foreground">{option.label}</span>
            {showOutcome && selectedOption === i && (
              <div className="mt-2 flex items-start gap-2">
                {option.score >= 80 ? (
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-premium flex-shrink-0 mt-0.5" />
                )}
                <p className="text-xs text-muted-foreground">{option.outcome}</p>
              </div>
            )}
          </button>
        ))}

        {!showOutcome ? (
          <Button onClick={handleReveal} disabled={selectedOption === null} className="w-full bg-accent hover:bg-accent/90">
            Reveal Outcome
          </Button>
        ) : (
          <Button onClick={handleNext} className="w-full bg-accent hover:bg-accent/90">
            {currentScenario < scenarios.length - 1 ? "Next Scenario" : "See Results"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EthicalDecisionSim;
