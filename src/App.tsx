import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { XPRewardProvider } from "@/contexts/XPRewardContext";
import XPRewardOverlay from "@/components/xp/XPRewardOverlay";
import { RouteTransition, FirstLoginCinematic } from "@/components/motion";
import Index from "./pages/Index";
import MarketingHome from "./pages/MarketingHome";
import ProtectedRoute from "./components/ProtectedRoute";
import Auth from "./pages/Auth";
import Courses from "./pages/Courses";
import PillarDetail from "./pages/PillarDetail";
import CourseLearning from "./pages/CourseLearning";
import MindArchitecture from "./pages/MindArchitecture";
import FinancialIntelligence from "./pages/FinancialIntelligence";
import Events from "./pages/Events";
import Resources from "./pages/Resources";
import UnitDetail from "./pages/UnitDetail";
import SessionReader from "./pages/SessionReader";
import PathwayIntelligence from "./pages/PathwayIntelligence";
import OperationsDashboard from "./pages/OperationsDashboard";
import OpsDashboard from "./pages/OpsDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminImport from "./pages/AdminImport";
import Profile from "./pages/Profile";
import TeamManagement from "./pages/TeamManagement";
import MyPlan from "./pages/MyPlan";
import LearnerInsights from "./pages/LearnerInsights";
import NotFound from "./pages/NotFound";
import LightGuideProvider from "./components/tutor/LightGuideProvider";
import { LogoSplash, RouteLoader, RouteLoaderFallback } from "./components/brand/LogoAnimation";
import { Suspense } from "react";

const queryClient = new QueryClient();

// Legacy /path/:pillarId/:pathId links now redirect to the pillar's main page.
const PathRedirect = () => {
  const { pillarId } = useParams();
  return <Navigate to={`/pillar/${pillarId ?? ""}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <XPRewardProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <XPRewardOverlay />
           <BrowserRouter>
           <LightGuideProvider>
          <LogoSplash />
          <RouteLoader />
          <FirstLoginCinematic />
          <RouteTransition>
          <Suspense fallback={<RouteLoaderFallback />}>
          <Routes>
            {/* Layer 1 — public marketing */}
            <Route path="/" element={<MarketingHome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/pillar/:pillarId" element={<PillarDetail />} />
            <Route path="/pathway-intelligence" element={<PathwayIntelligence />} />
            <Route path="/events" element={<Events />} />
            <Route path="/resources" element={<Resources />} />

            {/* Layer 2 — authenticated journey */}
            <Route path="/journey" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/my-plan" element={<ProtectedRoute><MyPlan /></ProtectedRoute>} />
            <Route path="/learner-insights" element={<ProtectedRoute><LearnerInsights /></ProtectedRoute>} />
            <Route path="/path/:pillarId/:pathId" element={<PathRedirect />} />
            <Route path="/pillar/:pillarId/unit/:unitId" element={<ProtectedRoute><UnitDetail /></ProtectedRoute>} />
            <Route path="/pillar/:pillarId/unit/:unitId/session/:sessionIndex" element={<SessionReader />} />
            <Route path="/learn/:courseId" element={<ProtectedRoute><CourseLearning /></ProtectedRoute>} />
            <Route path="/learning-paths" element={<Navigate to="/journey" replace />} />
            <Route path="/mind-architecture" element={<ProtectedRoute><MindArchitecture /></ProtectedRoute>} />
            <Route path="/financial-intelligence" element={<ProtectedRoute><FinancialIntelligence /></ProtectedRoute>} />
            {/* Layer 3 — team / admin operations */}
            <Route path="/dashboard" element={<ProtectedRoute><OperationsDashboard /></ProtectedRoute>} />
            <Route path="/ops-dashboard" element={<ProtectedRoute><OpsDashboard /></ProtectedRoute>} />
            <Route path="/admin/import" element={<ProtectedRoute><AdminImport /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/team-management" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </RouteTransition>
           </LightGuideProvider>
          </BrowserRouter>
        </TooltipProvider>
      </XPRewardProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
