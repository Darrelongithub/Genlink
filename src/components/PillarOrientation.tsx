import { useState } from "react";
import { pillarAssessments, computeArchetype, type PillarAssessment, type LearnerArchetype } from "@/data/orientationAssessments";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  ArrowRight, CheckCircle2, RotateCcw, Target, Layers, Eye,
} from "lucide-react";

interface PillarOrientationProps {
  pillarId: string;
  pillarColor: string;
  onComplete: (archetype: LearnerArchetype) => void;
}

const PillarOrientation = ({ pillarId, pillarColor, onComplete }: PillarOrientationProps) => {
  const assessment = pillarAssessments[pillarId];
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, number>>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedWeights, setSelectedWeights] = useState<Record<string, number>>({});
  const [result, setResult] = useState<LearnerArchetype | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);

  if (!assessment) return null;

  const question = assessment.questions[currentQuestion];
  const progress = (currentQuestion / assessment.questions.length) * 100;

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

    if (currentQuestion < assessment.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      const archetype = computeArchetype(newAnswers, assessment);
      setResult(archetype);
    }
  };

  const handleReset = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setSelectedOption(null);
    setSelectedWeights({});
    setResult(null);
    setShowAlternatives(false);
  };

  // ─── Result View ──────────────────────────────────────────────
  if (result) {
    const alternates = assessment.archetypes.filter(
      (a) => result.alternatePathIds.includes(a.recommendedPathId)
    );

    return (
      <Card className="border-border shadow-lg">
        <CardHeader className="text-center pb-4">
          <div
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: `${pillarColor}22` }}
          >
            <Target className="w-8 h-8" style={{ color: pillarColor }} />
          </div>
          <Badge className="mx-auto mb-2 bg-accent text-accent-foreground text-xs">
            Your Learner Archetype
          </Badge>
          <CardTitle className="text-2xl">{result.title}</CardTitle>
          <CardDescription className="text-base mt-2">{result.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Strengths */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Core Strengths
            </p>
            <div className="flex flex-wrap gap-2">
              {result.strengths.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs font-normal">
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          {/* Dimension Scores */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Diagnostic Profile
            </p>
            <div className="space-y-2">
              {assessment.dimensions.map((dim) => {
                const total = Object.values(answers).reduce(
                  (sum, w) => sum + (w[dim.id] || 0), 0
                );
                const max = assessment.questions.length * 3;
                const pct = Math.round((total / max) * 100);
                return (
                  <div key={dim.id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 text-right">{dim.label}</span>
                    <div className="flex-1">
                      <Progress value={pct} className="h-2" />
                    </div>
                    <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center italic">
            This assessment reveals your natural orientation — you are free to choose any path that resonates with your goals.
          </p>

          {/* Alternative Directions */}
          {!showAlternatives && alternates.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setShowAlternatives(true)}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Alternative Directions
            </Button>
          )}

          {showAlternatives && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Alternative Directions
              </p>
              {alternates.map((alt) => (
                <div key={alt.id} className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-sm font-medium text-foreground">{alt.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alt.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake
            </Button>
            <Button
              onClick={() => onComplete(result)}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              View Recommended Path
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Question View ────────────────────────────────────────────
  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            <Layers className="w-3 h-3 mr-1" />
            Scenario {currentQuestion + 1} of {assessment.questions.length}
          </Badge>
          <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 mb-4" />
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
        <Button
          onClick={handleNext}
          disabled={!selectedOption}
          className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {currentQuestion < assessment.questions.length - 1 ? "Next Scenario" : "Reveal My Archetype"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default PillarOrientation;
