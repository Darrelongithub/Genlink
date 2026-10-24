import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { XPRewardProvider } from "@/contexts/XPRewardContext";
import XPRewardOverlay from "@/components/xp/XPRewardOverlay";
import { RouteTransition, FirstLoginCinematic } from "@/components/motion";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import MarketingHome from "./pages/MarketingHome";
import NotFound from "./pages/NotFound";
import LightGuideProvider from "./components/tutor/LightGuideProvider";
import { LogoSplash, RouteLoader, RouteLoaderFallback } from "./components/brand/LogoAnimation";
import { Suspense, lazy } from "react";

// Every page except the landing page is loaded on demand. They used to all
// ship in one bundle, so a phone joining on school wifi had to download and
// parse the admin import tool, the ops dashboards and every simulation
// before the first page could move -- the main "the app is slow" cost, and
// it got slower with every page added. MarketingHome stays eager because it
// is the front door; the existing Suspense fallback covers the rest.
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Courses = lazy(() => import("./pages/Courses"));
const PillarDetail = lazy(() => import("./pages/PillarDetail"));
const CourseLearning = lazy(() => import("./pages/CourseLearning"));
const MindArchitecture = lazy(() => import("./pages/MindArchitecture"));
const FinancialIntelligence = lazy(() => import("./pages/FinancialIntelligence"));
const Events = lazy(() => import("./pages/Events"));
const Resources = lazy(() => import("./pages/Resources"));
const UnitDetail = lazy(() => import("./pages/UnitDetail"));
const SessionReader = lazy(() => import("./pages/SessionReader"));
const PathwayIntelligence = lazy(() => import("./pages/PathwayIntelligence"));
const OperationsDashboard = lazy(() => import("./pages/OperationsDashboard"));
const OpsDashboard = lazy(() => import("./pages/OpsDashboard"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminImport = lazy(() => import("./pages/AdminImport"));
const Profile = lazy(() => import("./pages/Profile"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const MyPlan = lazy(() => import("./pages/MyPlan"));
const LearnerInsights = lazy(() => import("./pages/LearnerInsights"));

// Defaults chosen for a room of phones, not a desktop demo:
// - staleTime keeps back-and-forth page switching from refetching everything;
// - refetchOnWindowFocus off stops a learner returning from another app
//   (constant on phones) from triggering a stampede of duplicate requests;
// - one retry, so a sick network fails honestly instead of spinning.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Legacy /path/:pillarId/:pathId links now redirect to the pillar's main page.
const PathRedirect = () => {
  const { pillarId } = useParams();
  return <Navigate to={`/pillar/${pillarId ?? ""}`} replace />;
};

/** The routed pages, behind an error boundary that resets on navigation. */
const AppRoutes = () => {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
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
    </ErrorBoundary>
  );
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
            <AppRoutes />
          </RouteTransition>
           </LightGuideProvider>
          </BrowserRouter>
        </TooltipProvider>
      </XPRewardProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
