import { useState } from "react";
import { Link } from "react-router-dom";
import StickyNav from "@/components/StickyNav";
import PsychProfile from "@/components/pillar1/PsychProfile";
import PathBranchMap from "@/components/pillar1/PathBranchMap";
import GrowthDashboard from "@/components/pillar1/GrowthDashboard";
import EthicalDecisionSim from "@/components/pillar1/EthicalDecisionSim";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import {
  Brain, ArrowRight, Target, Shield, TrendingUp, Layers,
  GraduationCap, Flame,
} from "lucide-react";
import type { ProfileType } from "@/data/courses";

const MindArchitecture = () => {
  const { user } = useAuth();
  const [profileType, setProfileType] = useState<ProfileType | null>(null);
  const [recommendedPathId, setRecommendedPathId] = useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = useState(false);

  const handleProfileComplete = (type: ProfileType, pathId: string) => {
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
            <Brain className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Pillar 1 — Internal Operating System</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Mind Architecture & Identity Design
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            This is not a course. It's your internal operating system. Build your cognitive foundation, discover your profile, and choose your mastery path.
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
              <span className="hidden sm:inline">Psychological</span> Profile
            </TabsTrigger>
            <TabsTrigger value="paths" className="flex items-center gap-2 py-3">
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Learning</span> Paths
            </TabsTrigger>
            <TabsTrigger value="simulations" className="flex items-center gap-2 py-3">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Ethical</span> Sims
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2 py-3">
              <TrendingUp className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
          </TabsList>

          {/* Psychological Profiling */}
          <TabsContent value="profiling" className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Discover Your Profile</h2>
                <p className="text-muted-foreground">
                  Answer honestly. This assessment reveals your natural tendencies and recommends the path most aligned with your strengths.
                </p>
              </div>
              <PsychProfile onComplete={handleProfileComplete} />
            </div>
          </TabsContent>

          {/* Learning Path Map with Branching */}
          <TabsContent value="paths" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Your Learning Path Map</h2>
              <p className="text-muted-foreground">
                Complete Mind Architecture (Foundation) to unlock your specialization path.
              </p>
              {!profileCompleted && (
                <Badge variant="outline" className="mt-2 text-xs">
                  Complete the Psychological Profile first to see your recommendation
                </Badge>
              )}
            </div>

            <PathBranchMap
              profileType={profileType}
              recommendedPathId={recommendedPathId}
              foundationCompleted={false}
            />

            {/* Foundation CTA */}
            <div className="text-center mt-8">
              <Button asChild className="bg-accent hover:bg-accent/90">
                <Link to="/learn/mind-architecture">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Start Foundation Course (Free)
                </Link>
              </Button>
            </div>
          </TabsContent>

          {/* Ethical Decision Simulations */}
          <TabsContent value="simulations" className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Ethical Decision Simulations</h2>
                <p className="text-muted-foreground">
                  Real scenarios. Real stakes. Practice making decisions that align with your values — not just your impulses.
                </p>
              </div>
              <EthicalDecisionSim />
            </div>
          </TabsContent>

          {/* Personal Growth Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Personal Growth Dashboard</h2>
                <p className="text-muted-foreground">
                  Track your habit streaks, cognitive resilience, and ethical clarity over time.
                </p>
              </div>
              {user ? (
                <GrowthDashboard />
              ) : (
                <div className="text-center py-12 space-y-4">
                  <Flame className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">Sign in to track your growth metrics</p>
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

export default MindArchitecture;
