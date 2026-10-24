import { useState } from "react";
import { Link } from "react-router-dom";
import StickyNav from "@/components/StickyNav";
import FinancialProfile from "@/components/pillar2/FinancialProfile";
import FinancialPathMap from "@/components/pillar2/FinancialPathMap";
// FinancialDashboard removed — it displayed hardcoded fake user metrics.
// A real, data-driven dashboard will land when session progress data exists.
import FinancialSimulation from "@/components/pillar2/FinancialSimulation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import {
  TrendingUp, ArrowRight, Target, Shield, Layers,
  GraduationCap, Flame, DollarSign,
} from "lucide-react";
import type { FinancialProfileType } from "@/data/courses";

const FinancialIntelligence = () => {
  const { user } = useAuth();
  const [profileType, setProfileType] = useState<FinancialProfileType | null>(null);
  const [recommendedPathId, setRecommendedPathId] = useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = useState(false);

  const handleProfileComplete = (type: FinancialProfileType, pathId: string) => {
    setProfileType(type);
    setRecommendedPathId(pathId);
    setProfileCompleted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <StickyNav />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30 mb-4">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Pillar 2 — Financial Operating System</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Financial Intelligence & Income Systems
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Rewire your relationship with money. Build discipline, understand markets, and design income systems that create long-term value.
          </p>
          {!user && (
            <Button asChild className="mt-6 bg-accent hover:bg-accent/90">
              <Link to="/auth">
                Sign In to Begin <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <Tabs defaultValue="profiling" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger value="profiling" className="flex items-center gap-2 py-3">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Financial</span> Profile
            </TabsTrigger>
            <TabsTrigger value="paths" className="flex items-center gap-2 py-3">
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Learning</span> Paths
            </TabsTrigger>
            <TabsTrigger value="simulations" className="flex items-center gap-2 py-3">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Financial</span> Sims
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2 py-3">
              <TrendingUp className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
          </TabsList>

          {/* Financial Profiling */}
          <TabsContent value="profiling" className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Discover Your Financial Profile</h2>
                <p className="text-muted-foreground">
                  Answer honestly. This assessment reveals your financial behavior patterns and recommends the path most aligned with your strengths.
                </p>
              </div>
              <FinancialProfile onComplete={handleProfileComplete} />
            </div>
          </TabsContent>

          {/* Financial Path Map */}
          <TabsContent value="paths" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Your Financial Path Map</h2>
              <p className="text-muted-foreground">
                Complete Money Psychology & Wealth Thinking (Foundation) to unlock your specialization path.
              </p>
              {!profileCompleted && (
                <Badge variant="outline" className="mt-2 text-xs">
                  Complete the Financial Profile first to see your recommendation
                </Badge>
              )}
            </div>

            <FinancialPathMap
              profileType={profileType}
              recommendedPathId={recommendedPathId}
              foundationCompleted={false}
            />

            {/* Foundation CTA */}
            <div className="text-center mt-8">
              <Button asChild className="bg-accent hover:bg-accent/90">
                <Link to="/learn/money-psychology">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Start Foundation Course (Free)
                </Link>
              </Button>
            </div>
          </TabsContent>

          {/* Financial Decision Simulations */}
          <TabsContent value="simulations" className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Financial Decision Simulations</h2>
                <p className="text-muted-foreground">
                  Real money scenarios. Practice making disciplined financial decisions — not impulsive ones.
                </p>
              </div>
              <FinancialSimulation />
            </div>
          </TabsContent>

          {/* Financial Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Financial Growth Dashboard</h2>
                <p className="text-muted-foreground">
                  Track your financial discipline, risk literacy, and entrepreneurial readiness over time.
                </p>
              </div>
              {user ? (
                <div className="text-center py-16 space-y-4 rounded-xl border border-dashed border-border bg-card/40">
                  <Flame className="w-10 h-10 text-accent mx-auto opacity-70" />
                  <p className="text-lg font-semibold text-foreground">Your growth dashboard begins here</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Complete your first Financial Intelligence session to start tracking discipline,
                    risk literacy, and portfolio metrics.
                  </p>
                  <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link to="/pillar/financial-intelligence">Start Session 1</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <Flame className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">Sign in to track your financial growth metrics</p>
                  <Button asChild variant="outline">
                    <Link to="/auth">Sign In</Link>
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinancialIntelligence;
