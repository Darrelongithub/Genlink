import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Zap, Gamepad2, ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScenarioChoice {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
}

interface Scenario {
  id: string;
  situation: string;
  context?: string;
  choices: ScenarioChoice[];
}

interface ScenarioGameProps {
  title: string;
  description: string;
  scenarios: Scenario[];
  xpReward: number;
  onComplete: (score: number) => void;
}

const ScenarioGame = ({
  title,
  description,
  scenarios,
  xpReward,
  onComplete,
}: ScenarioGameProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const currentScenario = scenarios[currentIndex];
  const progress = ((currentIndex + (showFeedback ? 1 : 0)) / scenarios.length) * 100;

  const handleChoice = (choiceId: string) => {
    if (showFeedback) return;
    setSelectedChoice(choiceId);
  };

  const handleSubmit = () => {
    if (!selectedChoice) return;
    
    const choice = currentScenario.choices.find(c => c.id === selectedChoice);
    if (choice?.isCorrect) {
      setCorrectCount(prev => prev + 1);
    }
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentIndex < scenarios.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedChoice(null);
      setShowFeedback(false);
    } else {
      const score = Math.round(((correctCount + (currentScenario.choices.find(c => c.id === selectedChoice)?.isCorrect ? 1 : 0)) / scenarios.length) * 100);
      setIsComplete(true);
      if (score >= 70) {
        onComplete(score);
      }
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedChoice(null);
    setShowFeedback(false);
    setCorrectCount(0);
    setIsComplete(false);
  };

  const selectedChoiceData = currentScenario?.choices.find(c => c.id === selectedChoice);
  const finalScore = Math.round((correctCount / scenarios.length) * 100);
  const passed = finalScore >= 70;

  if (isComplete) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className={cn(
            "w-20 h-20 rounded-full mx-auto flex items-center justify-center",
            passed ? "bg-accent/20" : "bg-destructive/20"
          )}>
            {passed ? (
              <CheckCircle2 className="w-10 h-10 text-accent" />
            ) : (
              <XCircle className="w-10 h-10 text-destructive" />
            )}
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-foreground">
              {passed ? "Scenario Complete! 🎉" : "Good Effort!"}
            </h3>
            <p className="text-muted-foreground mt-2">
              You made the right decision {correctCount} out of {scenarios.length} times
            </p>
          </div>

          <div className="text-4xl font-bold text-foreground">
            {finalScore}%
          </div>

          {passed && (
            <Badge className="bg-accent text-accent-foreground text-lg px-4 py-2">
              <Zap className="w-5 h-5 mr-2" />
              +{xpReward} XP Earned!
            </Badge>
          )}

          <div className="flex gap-3 justify-center">
            <Button onClick={handleReset} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Play Again
            </Button>
            {passed && (
              <Button className="bg-accent hover:bg-accent/90">
                Continue Learning
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-accent" />
              {title}
            </CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-accent" />
            +{xpReward} XP
          </Badge>
        </div>
        <div className="space-y-1 pt-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Scenario {currentIndex + 1} of {scenarios.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Scenario situation */}
        <div className="p-4 bg-muted/50 rounded-lg">
          {currentScenario.context && (
            <p className="text-sm text-muted-foreground mb-2 italic">
              {currentScenario.context}
            </p>
          )}
          <p className="text-foreground font-medium">{currentScenario.situation}</p>
        </div>

        {/* Choices */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">What would you do?</p>
          {currentScenario.choices.map((choice, index) => (
            <button
              key={choice.id}
              onClick={() => handleChoice(choice.id)}
              disabled={showFeedback}
              className={cn(
                "w-full p-4 text-left rounded-lg border-2 transition-all",
                "hover:border-accent/50 hover:bg-accent/5",
                selectedChoice === choice.id && !showFeedback && "border-accent bg-accent/10",
                selectedChoice !== choice.id && !showFeedback && "border-border",
                showFeedback && selectedChoice === choice.id && choice.isCorrect && "border-accent bg-accent/20",
                showFeedback && selectedChoice === choice.id && !choice.isCorrect && "border-destructive bg-destructive/20",
                showFeedback && selectedChoice !== choice.id && choice.isCorrect && "border-accent/50 bg-accent/10",
                showFeedback && "cursor-default"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1">{choice.text}</span>
                {showFeedback && selectedChoice === choice.id && (
                  choice.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  )
                )}
                {showFeedback && selectedChoice !== choice.id && choice.isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-accent/50 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Feedback */}
        {showFeedback && selectedChoiceData && (
          <div className={cn(
            "p-4 rounded-lg",
            selectedChoiceData.isCorrect ? "bg-accent/10 border border-accent/30" : "bg-muted"
          )}>
            <p className="text-sm">
              <span className="font-semibold">
                {selectedChoiceData.isCorrect ? "Correct! " : "Not quite. "}
              </span>
              {selectedChoiceData.feedback}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!showFeedback ? (
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedChoice}
              className="flex-1 bg-accent hover:bg-accent/90"
            >
              Confirm Choice
            </Button>
          ) : (
            <Button onClick={handleNext} className="flex-1 bg-accent hover:bg-accent/90">
              {currentIndex < scenarios.length - 1 ? (
                <>
                  Next Scenario
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                "See Results"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScenarioGame;
