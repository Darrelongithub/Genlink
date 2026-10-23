import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Lightbulb, 
  TrendingUp, 
  Code, 
  Palette,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { pillars } from "@/data/courses";

interface Question {
  id: number;
  question: string;
  options: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    category: string;
  }[];
}

// Each quick-quiz answer maps to a canonical pillar id so the recommendation
// card links straight to the pillar page (Fix 2). The full 40-question
// diagnostic remains the single deep funnel (Fix 3).
const CATEGORY_TO_PILLARS: Record<string, string[]> = {
  wealth:  ["financial-intelligence", "creator-economy", "programming-systems"],
  tech:    ["programming-systems", "digital-literacy", "cybersecurity"],
  mindset: ["personal-mastery", "civic-leadership", "financial-intelligence"],
  build:   ["creator-economy", "financial-intelligence", "digital-literacy"],
};

const questions: Question[] = [
  {
    id: 1,
    question: "What's your primary learning goal?",
    options: [
      { label: "Build wealth & financial freedom", icon: TrendingUp, category: "wealth" },
      { label: "Master tech & coding skills",      icon: Code,       category: "tech" },
      { label: "Grow mentally & lead myself",      icon: Brain,      category: "mindset" },
      { label: "Build something of my own",        icon: Palette,    category: "build" },
    ]
  }
];

const QuickQuiz = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleSelect = (category: string) => {
    setSelectedCategory(category);
    setTimeout(() => {
      setShowResults(true);
    }, 500);
  };

  const recommendedPillars = selectedCategory
    ? (CATEGORY_TO_PILLARS[selectedCategory] ?? [])
        .map((id) => pillars.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : [];

  const resetQuiz = () => {
    setCurrentStep(0);
    setSelectedCategory(null);
    setShowResults(false);
  };

  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 space-y-3">
            <Badge variant="outline" className="border-accent/30 text-accent px-4 py-1.5">
              <Lightbulb className="w-4 h-4 mr-2" />
              Quick Assessment
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Discover Your Perfect Learning Path
            </h2>
            <p className="text-muted-foreground text-lg">
              Answer one quick question and we'll recommend courses tailored just for you
            </p>
          </div>

          {!showResults ? (
            <div className="bg-card rounded-2xl p-8 shadow-xl border border-border/50">
              <h3 className="text-xl font-semibold text-center text-foreground mb-8">
                {questions[currentStep].question}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questions[currentStep].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelect(option.category)}
                    className={`group relative p-6 rounded-xl border-2 transition-all duration-300 text-left
                      ${selectedCategory === option.category 
                        ? 'border-accent bg-accent/10 shadow-lg' 
                        : 'border-border/50 hover:border-accent/50 hover:bg-muted/50'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors
                        ${selectedCategory === option.category 
                          ? 'bg-accent text-accent-foreground' 
                          : 'bg-muted group-hover:bg-accent/20'}`}>
                        <option.icon className="w-6 h-6" />
                      </div>
                      <span className="font-medium text-foreground">{option.label}</span>
                    </div>
                    
                    {selectedCategory === option.category && (
                      <CheckCircle2 className="absolute top-4 right-4 w-6 h-6 text-accent animate-scale-in" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl p-8 shadow-xl border border-border/50 animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 mb-4">
                  <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                  <span className="text-accent font-medium">Perfect Match Found!</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  Recommended Courses for You
                </h3>
              </div>

              <div className="space-y-3 mb-8">
                {recommendedPillars.map((p, index) => (
                  <Link
                    key={p.id}
                    to={`/pillar/${p.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <div
                      className="w-14 h-14 rounded-lg flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                        {p.name}
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-1">{p.tagline}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>

              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">
                  This is a 60-second preview. Ready for a personalised plan across all 7 pillars?
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={resetQuiz}
                  className="border-accent/30"
                >
                  Retake Quick Quiz
                </Button>
                <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                  <Link to="/pathway-intelligence">
                    Take the full Pathway Assessment
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default QuickQuiz;
