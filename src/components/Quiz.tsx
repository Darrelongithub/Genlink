import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle } from "lucide-react";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizProps {
  courseId: string;
  questions: QuizQuestion[];
  onComplete?: (score: number, total: number) => void;
}

const Quiz = ({ courseId, questions, onComplete }: QuizProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const handleAnswer = () => {
    const answerIndex = parseInt(selectedAnswer);
    const isCorrect = answerIndex === questions[currentQuestion].correctAnswer;
    
    setAnswers([...answers, answerIndex]);
    if (isCorrect) {
      setScore(score + 1);
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer("");
    } else {
      setShowResult(true);
      onComplete?.(isCorrect ? score + 1 : score, questions.length);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (showResult) {
    const percentage = (score / questions.length) * 100;
    return (
      <Card className="max-w-2xl mx-auto animate-scale-in">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl mb-2">Quiz Complete!</CardTitle>
          <CardDescription className="text-lg">
            You scored {score} out of {questions.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              {percentage.toFixed(0)}%
            </div>
            <Progress value={percentage} className="h-3" />
          </div>
          
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const userAnswer = answers[idx];
              const isCorrect = userAnswer === q.correctAnswer;
              
              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-lg border-2 ${
                    isCorrect ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 mt-1" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-2">{q.question}</p>
                      <p className="text-sm text-muted-foreground">
                        Your answer: {q.options[userAnswer]}
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                          Correct answer: {q.options[q.correctAnswer]}
                        </p>
                      )}
                      {q.explanation && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            onClick={() => {
              setCurrentQuestion(0);
              setSelectedAnswer("");
              setShowResult(false);
              setScore(0);
              setAnswers([]);
            }}
            className="w-full bg-accent hover:bg-accent/90"
          >
            Retake Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  const question = questions[currentQuestion];

  return (
    <Card className="max-w-2xl mx-auto animate-fade-in">
      <CardHeader>
        <div className="mb-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>Score: {score}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <CardTitle className="text-xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <div
                key={index}
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-accent/50 ${
                  selectedAnswer === index.toString()
                    ? "border-accent bg-accent/5"
                    : "border-border"
                }`}
                onClick={() => setSelectedAnswer(index.toString())}
              >
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>

        <Button
          onClick={handleAnswer}
          disabled={!selectedAnswer}
          className="w-full bg-accent hover:bg-accent/90"
        >
          {currentQuestion < questions.length - 1 ? "Next Question" : "Finish Quiz"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default Quiz;