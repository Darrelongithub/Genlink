import { useState } from "react";
import { psychProfileQuestions, profileTypeMap, determineProfileType, type ProfileType } from "@/data/courses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PsychProfileProps {
  onComplete: (profileType: ProfileType, recommendedPathId: string) => void;
}

const PsychProfile = ({ onComplete }: PsychProfileProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<ProfileType | null>(null);

  const question = psychProfileQuestions[currentQuestion];
  const progress = ((currentQuestion) / psychProfileQuestions.length) * 100;

  const handleSelect = (value: string, traits: string[]) => {
    setSelectedOption(value);
    setAnswers(prev => ({ ...prev, [question.id]: traits }));
  };

  const handleNext = () => {
    if (!selectedOption) return;
    setSelectedOption(null);

    if (currentQuestion < psychProfileQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      const profileType = determineProfileType(answers);
      setResult(profileType);
    }
  };

  const handleReset = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setSelectedOption(null);
    setResult(null);
  };

  if (result) {
    const profile = profileTypeMap[result];
    return (
      <Card className="border-accent/30 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-accent" />
          </div>
          <Badge className="mx-auto mb-2 bg-accent text-accent-foreground">Your Profile</Badge>
          <CardTitle className="text-2xl">{profile.title}</CardTitle>
          <CardDescription className="text-base">{profile.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Recommended Path:</p>
            <p>{profileTypeMap[result].title === "The Identity Builder" 
              ? "Identity & Discipline Builder" 
              : profileTypeMap[result].title === "The Influence Architect"
              ? "Leadership Psychology & Influence"
              : "High-Performance Systems Architect"
            }</p>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            This is a recommendation — you're free to choose any path that resonates with you.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake
            </Button>
            <Button onClick={() => onComplete(result, profile.pathId)} className="flex-1 bg-accent hover:bg-accent/90">
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            Question {currentQuestion + 1} of {psychProfileQuestions.length}
          </Badge>
          <span className="text-xs text-muted-foreground">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2 mb-4" />
        <CardTitle className="text-lg">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {question.options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value, option.traits)}
            className={cn(
              "w-full text-left p-4 rounded-lg border-2 transition-all duration-200",
              selectedOption === option.value
                ? "border-accent bg-accent/10 shadow-sm"
                : "border-border hover:border-accent/50"
            )}
          >
            <div className="flex items-center gap-3">
              {selectedOption === option.value && <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />}
              <span className="text-sm font-medium text-foreground">{option.label}</span>
            </div>
          </button>
        ))}
        <Button
          onClick={handleNext}
          disabled={!selectedOption}
          className="w-full mt-4 bg-accent hover:bg-accent/90"
        >
          {currentQuestion < psychProfileQuestions.length - 1 ? "Next" : "See My Profile"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default PsychProfile;
