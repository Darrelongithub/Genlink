import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useModules, useModulesMeta, useEnrollment, useUserModuleProgress, useCompleteModule, Module } from "@/hooks/useUserProgress";
import { courses, Course, getPillarForCourse, entrepreneurialIntelligenceModule } from "@/data/courses";
import StickyNav from "@/components/StickyNav";
import XPBar from "@/components/learning/XPBar";
import ModuleCard from "@/components/learning/ModuleCard";
import CourseProgress from "@/components/learning/CourseProgress";
import DragDropExercise from "@/components/simulations/DragDropExercise";
import ScenarioGame from "@/components/simulations/ScenarioGame";
import BudgetSimulator from "@/components/simulations/BudgetSimulator";
import CodeSandbox from "@/components/simulations/CodeSandbox";
import TradingSimulator from "@/components/simulations/TradingSimulator";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Clock, 
  Star, 
  BookOpen, 
  Lock,
  LogIn
} from "lucide-react";
import { cn } from "@/lib/utils";

// Sample exercise content for different module types
const getExerciseContent = (module: Module, onComplete: (score: number) => void) => {
  const content = module.content as { type?: string; scenario?: string };
  
  switch (content.type) {
    case "drag_drop":
      if (module.course_id === "financial-wisdom" && content.scenario === "savings-priority") {
        return (
          <DragDropExercise
            title="Savings Priority Exercise"
            description="Drag each item to the correct priority category for building savings"
            items={[
              { id: "1", text: "Emergency Fund (3-6 months)", category: "high" },
              { id: "2", text: "High-Interest Debt Payment", category: "high" },
              { id: "3", text: "Retirement Savings", category: "medium" },
              { id: "4", text: "Vacation Fund", category: "low" },
              { id: "5", text: "New Phone", category: "low" },
              { id: "6", text: "Insurance Premiums", category: "high" },
            ]}
            categories={[
              { id: "high", name: "High Priority", description: "Address these first" },
              { id: "medium", name: "Medium Priority", description: "Important but flexible" },
              { id: "low", name: "Low Priority", description: "Nice to have" },
            ]}
            xpReward={module.xp_reward}
            onComplete={onComplete}
          />
        );
      }
      return (
        <DragDropExercise
          title={module.title}
          description="Match items to their correct categories"
          items={[
            { id: "1", text: "Item A", category: "cat1" },
            { id: "2", text: "Item B", category: "cat2" },
            { id: "3", text: "Item C", category: "cat1" },
            { id: "4", text: "Item D", category: "cat2" },
          ]}
          categories={[
            { id: "cat1", name: "Category 1" },
            { id: "cat2", name: "Category 2" },
          ]}
          xpReward={module.xp_reward}
          onComplete={onComplete}
        />
      );

    case "scenario_game":
      if (module.course_id === "financial-wisdom") {
        return (
          <ScenarioGame
            title="Investment Decision Game"
            description="Make smart investment choices in these real-world scenarios"
            scenarios={[
              {
                id: "1",
                context: "You've just received a Ksh 50,000 bonus from work.",
                situation: "A friend suggests investing it all in a 'guaranteed' crypto scheme promising 50% returns in a month. What do you do?",
                choices: [
                  { id: "a", text: "Invest everything - 50% returns sound great!", isCorrect: false, feedback: "High returns with guarantees are usually scams. Never invest in schemes promising unrealistic returns." },
                  { id: "b", text: "Split between savings and diversified investments", isCorrect: true, feedback: "Smart choice! Diversification and building emergency savings first is key." },
                  { id: "c", text: "Put it all under your mattress", isCorrect: false, feedback: "While safe from scams, you lose to inflation. Consider interest-bearing accounts." },
                ],
              },
              {
                id: "2",
                context: "Your emergency fund has 3 months of expenses saved.",
                situation: "The stock market just dropped 20%. What's your move?",
                choices: [
                  { id: "a", text: "Sell everything to prevent more losses", isCorrect: false, feedback: "Selling during a dip locks in your losses. Markets historically recover." },
                  { id: "b", text: "Keep your investments and continue regular contributions", isCorrect: true, feedback: "Correct! Staying the course and buying during dips is a proven long-term strategy." },
                  { id: "c", text: "Take out a loan to buy more stocks", isCorrect: false, feedback: "Never invest with borrowed money, especially during volatile times." },
                ],
              },
            ]}
            xpReward={module.xp_reward}
            onComplete={onComplete}
          />
        );
      }
      return (
        <ScenarioGame
          title={module.title}
          description="Make the best decisions in these scenarios"
          scenarios={[
            {
              id: "1",
              situation: "Sample scenario question. What would you do?",
              choices: [
                { id: "a", text: "Option A", isCorrect: false, feedback: "Not the best choice." },
                { id: "b", text: "Option B", isCorrect: true, feedback: "Great choice!" },
                { id: "c", text: "Option C", isCorrect: false, feedback: "Consider other options." },
              ],
            },
          ]}
          xpReward={module.xp_reward}
          onComplete={onComplete}
        />
      );

    case "simulation":
      if (module.course_id === "financial-wisdom" && content.scenario === "budget-builder") {
        return (
          <BudgetSimulator
            title="Build Your Budget"
            description="Allocate your monthly income across different categories"
            monthlyIncome={50000}
            xpReward={module.xp_reward}
            onComplete={onComplete}
          />
        );
      }
      if (module.course_id === "forex-trading" && content.scenario === "trading-sim") {
        return (
          <TradingSimulator
            title="Forex Trading Practice"
            description="Practice buying and selling currency pairs with virtual money"
            startingBalance={1000}
            targetProfit={100}
            xpReward={module.xp_reward}
            onComplete={onComplete}
          />
        );
      }
      return (
        <div className="p-8 text-center bg-muted/50 rounded-lg">
          <p className="text-muted-foreground">Interactive simulation coming soon!</p>
          <Button onClick={() => onComplete(100)} className="mt-4 bg-accent">
            Mark as Complete (+{module.xp_reward} XP)
          </Button>
        </div>
      );

    case "sandbox":
      if (module.course_id === "python-programming") {
        return (
          <CodeSandbox
            title="Python Practice"
            description="Write Python code to solve the challenge"
            initialCode={`# Write a function that prints "Hello, Kenya!"\n\ndef greet():\n    # Your code here\n    pass\n\ngreet()`}
            expectedOutput="Hello, Kenya!"
            hints={[
              "Use the print() function to display text",
              "Replace 'pass' with your print statement",
              "The syntax is: print(\"your text here\")"
            ]}
            language="python"
            xpReward={module.xp_reward}
            onComplete={onComplete}
          />
        );
      }
      return (
        <CodeSandbox
          title={module.title}
          description="Practice coding in the sandbox"
          initialCode={`// Write your code here\nconsole.log("Hello World!");`}
          expectedOutput="Hello World!"
          language="javascript"
          xpReward={module.xp_reward}
          onComplete={onComplete}
        />
      );

    case "video":
    default:
      return (
        <div className="space-y-6">
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Video lesson placeholder</p>
              <p className="text-sm text-muted-foreground mt-2">
                In production, this would be an embedded video player
              </p>
            </div>
          </div>
          <Button onClick={() => onComplete(100)} className="w-full bg-accent">
            Complete Lesson (+{module.xp_reward} XP)
          </Button>
        </div>
      );
  }
};

const CourseLearning = () => {
  const { courseId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<Module | null>(null);

  const course = courses.find(c => c.id === courseId);
  const { data: modules = [], isLoading: modulesLoading } = useModules(courseId);
  const { data: modulesMeta = [], isLoading: metaLoading } = useModulesMeta(courseId);
  const { data: isEnrolled = false } = useEnrollment(courseId);
  const { data: progress = [], isLoading: progressLoading } = useUserModuleProgress(courseId);
  const completeModuleMutation = useCompleteModule();
  const { toast } = useToast();

  const isLoading = modulesLoading || metaLoading || progressLoading || authLoading;

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <StickyNav />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Course not found</h1>
          <Link to="/" className="text-accent hover:underline mt-4 inline-block">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  const handleModuleClick = (module: Module) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setActiveModule(module);
  };

  const handleCompleteModule = (score: number) => {
    if (activeModule && user) {
      completeModuleMutation.mutate({
        moduleId: activeModule.id,
        score,
      });
    }
  };

  const getModuleProgress = (moduleId: string) => {
    return progress.find(p => p.module_id === moduleId);
  };

  // Merge full (content-bearing) modules returned by RLS with the public
  // metadata list so we can render locked placeholders for gated content.
  const accessibleIds = new Set(modules.map(m => m.id));
  const merged = modulesMeta.map(meta => {
    const full = modules.find(m => m.id === meta.id);
    const locked = !full; // RLS hid the content row
    return { meta, full, locked };
  });
  const freeItems = merged.filter(({ meta }) => meta.module_type === "free");
  const premiumItems = merged.filter(({ meta }) => meta.module_type === "premium");

  const handleLockedClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    toast({
      title: "Enroll to unlock this lesson",
      description: "Enroll in this course to access full module content.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <StickyNav />

      {/* Course Header */}
      <div className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <Link 
            to="/#courses" 
            className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </Link>
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <img 
              src={course.image} 
              alt={course.title}
              className="w-full md:w-64 h-40 object-cover rounded-lg"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {course.isPremium && (
                  <Badge className="bg-premium text-premium-foreground">Premium</Badge>
                )}
                <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground">
                  {course.category}
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{course.title}</h1>
              <p className="text-primary-foreground/80 mb-4">{course.description}</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {course.duration}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-premium text-premium" />
                  {course.rating}
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {freeItems.length} free modules
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {!user && (
          <div className="mb-8 p-6 bg-accent/10 border border-accent/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LogIn className="w-6 h-6 text-accent" />
              <div>
                <p className="font-semibold text-foreground">Sign in to track your progress</p>
                <p className="text-sm text-muted-foreground">Create a free account to earn XP and save your progress</p>
              </div>
            </div>
            <Button onClick={() => navigate("/auth")} className="bg-accent hover:bg-accent/90">
              Sign In / Sign Up
            </Button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Progress card for logged in users */}
            {user && !isLoading && (
              <CourseProgress 
                modules={modules} 
                progress={progress} 
                courseName={course.title}
              />
            )}

            {/* Free Fundamentals Section */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent" />
                Free Fundamentals
              </h2>
              <div className="space-y-4">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                  ))
                ) : (
                  freeItems.map(({ meta, full, locked }, index) => {
                    const m = (full ?? { ...meta, content: {} }) as Module;
                    return (
                      <ModuleCard
                        key={meta.id}
                        module={m}
                        progress={getModuleProgress(meta.id)}
                        isLocked={locked}
                        onClick={() => (locked ? handleLockedClick() : handleModuleClick(m))}
                        index={index + 1}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {/* Premium Modules */}
            {premiumItems.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-premium" />
                  Premium Core Course
                </h2>
                <div className="space-y-4">
                  {premiumItems.map(({ meta, full, locked }, index) => {
                    const m = (full ?? { ...meta, content: {} }) as Module;
                    const lockedForUser = locked || !isEnrolled;
                    return (
                      <ModuleCard
                        key={meta.id}
                        module={m}
                        progress={getModuleProgress(meta.id)}
                        isLocked={lockedForUser}
                        onClick={() => (lockedForUser ? handleLockedClick() : handleModuleClick(m))}
                        index={freeItems.length + index + 1}
                      />
                    );
                  })}
                </div>

                {/* Upgrade CTA */}
                <div className="mt-6 p-6 bg-gradient-to-r from-premium/10 to-accent/10 border border-premium/30 rounded-lg">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">Unlock Premium Content</h3>
                      <p className="text-muted-foreground">
                        {isEnrolled
                          ? "You're enrolled — all premium modules below are unlocked for you."
                          : "Enroll to access advanced modules, hands-on projects, and certification."}
                      </p>
                    </div>
                    {!isEnrolled && (
                      <Button className="bg-premium hover:bg-premium/90 text-premium-foreground whitespace-nowrap">
                        Enroll for {course.price}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {user && <XPBar />}

            {/* Course info card */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold">What you'll learn</h3>
              <ul className="space-y-2">
                {course.whatYouLearn.slice(0, 4).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-accent">✓</span>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Prerequisites */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold">Prerequisites</h3>
              <ul className="space-y-2">
                {course.prerequisites.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Module Exercise Dialog */}
      <Dialog open={!!activeModule} onOpenChange={() => setActiveModule(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeModule?.title}</DialogTitle>
          </DialogHeader>
          {activeModule && (
            <div className="mt-4">
              {getExerciseContent(activeModule, handleCompleteModule)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseLearning;
