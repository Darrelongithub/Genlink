import StickyNav from "@/components/StickyNav";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

/**
 * Layer 3 — Operations dashboard shell.
 * Only admin / moderator roles may view. Students bounce to their journey.
 */
const OperationsDashboard = () => {
  const { tier, roleLabel, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading operations…
      </div>
    );
  }

  if (tier === "guest") return <Navigate to="/" replace />;
  if (tier === "student") return <Navigate to="/journey" replace />;

  return (
    <div className="min-h-screen bg-background">
      <StickyNav />
      <div className="container mx-auto px-4 py-12 space-y-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#C9A84C]" />
          <div>
            <p className="text-xs uppercase tracking-widest text-[#C9A84C]">{roleLabel}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Operations Dashboard</h1>
          </div>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Curriculum health, learner cohorts, and platform telemetry will surface here.
          This shell is scaffolded so the Layer 3 navigation has a valid destination —
          detailed panels ship once the backend is stabilised.
        </p>
      </div>
    </div>
  );
};

export default OperationsDashboard;