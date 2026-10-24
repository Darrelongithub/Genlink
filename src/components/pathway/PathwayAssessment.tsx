import { useState } from "react";
import {
  pieQuestions,
  pieSections,
  pieDimensions,
  type PIEQuestion,
} from "@/data/pathwayIntelligence";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowLeft, CheckCircle2, Layers } from "lucide-react";

interface PathwayAssessmentProps {
  onComplete: (answers: Record<string, Record<string, number>>) => void;
}

const PathwayAssessment = ({ onComplete }: PathwayAssessmentProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, number>>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedWeights, setSelectedWeights] = useState<Record<string, number>>({});

  const question = pieQuestions[currentIndex];
  const totalQuestions = pieQuestions.length;
  const progress = (Object.keys(answers).length / totalQuestions) * 100;

  // Find current section
  const currentSection = pieSections.find((s) =>
    s.questionIds.includes(question.id)
  );
  const sectionIndex = pieSections.findIndex((s) => s.id === currentSection?.id);
  const questionIndexInSection = currentSection
    ? currentSection.questionIds.indexOf(question.id) + 1
    : 0;
  const sectionTotal = currentSection?.questionIds.length || 0;

  const handleSelect = (value: string, weights: Record<string, number>) => {
    setSelectedOption(value);
    setSelectedWeights(weights);
  };

  const handleNext = () => {
    if (!selectedOption) return;
    const newAnswers = { ...answers, [question.id]: selectedWeights };
    setAnswers(newAnswers);
    setSelectedOption(null);
    setSelectedWeights({});

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete(newAnswers);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      const prevQ = pieQuestions[currentIndex - 1];
      if (answers[prevQ.id]) {
        // Restore previous selection state
        setSelectedOption(null);
        setSelectedWeights({});
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {pieSections.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  "h-1.5 rounded-full flex-1 max-w-[60px] transition-colors",
                  i < sectionIndex
                    ? "bg-accent"
                    : i === sectionIndex
                    ? "bg-accent/60"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Section {sectionIndex + 1} of {pieSections.length}: {currentSection?.title}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {Object.keys(answers).length}/{totalQuestions}
        </Badge>
      </div>

      <Progress value={progress} className="h-1.5" />

      {/* Question Card */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-xs">
              <Layers className="w-3 h-3 mr-1" />
              {questionIndexInSection} of {sectionTotal}
            </Badge>
          </div>
          <CardTitle className="text-lg leading-relaxed">{question.scenario}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {question.options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value, option.weights)}
              className={cn(
                "w-full text-left p-4 rounded-lg border-2 transition-all duration-200",
                selectedOption === option.value
                  ? "border-accent bg-accent/10 shadow-sm"
                  : "border-border hover:border-accent/50"
              )}
            >
              <div className="flex items-start gap-3">
                {selectedOption === option.value && (
                  <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                )}
                <span className="text-sm font-medium text-foreground">{option.label}</span>
              </div>
            </button>
          ))}

          <div className="flex gap-3 mt-4">
            {currentIndex > 0 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!selectedOption}
              className={cn(
                "bg-accent hover:bg-accent/90 text-accent-foreground",
                currentIndex === 0 ? "w-full" : "flex-1"
              )}
            >
              {currentIndex < totalQuestions - 1 ? "Next" : "Generate Blueprint"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PathwayAssessment;
