import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartmentRole } from "@/hooks/useDepartmentRole";
import { useUserRole } from "@/hooks/useUserRole";
import { DEPARTMENTS, type DepartmentRole } from "@/lib/ops/departments";
import { GoldParticles } from "@/components/motion";
import CeoView from "@/components/ops/views/CeoView";
import OpsManagerView from "@/components/ops/views/OpsManagerView";
import DepartmentMemberView from "@/components/ops/views/DepartmentMemberView";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function OpsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { departmentRole, loading: roleLoading } = useDepartmentRole();
  const { isAdmin } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F9F6F0" }}>
        <div className="text-[#0D2B55]">Loading operations…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  // FIX 1: only bounce a user who has no ops-relevant role. An admin without
  // a department_role still deserves to see the ops shell (empty state).
  if (!departmentRole && !isAdmin) return <Navigate to="/journey" replace />;

  return (
    <div className="min-h-screen bg-cinematic-surface relative">
      <GoldParticles count={14} opacity={0.06} />
      <div className="flex flex-col lg:flex-row">
        <Sidebar role={departmentRole ?? ("ceo" as DepartmentRole)} email={user.email ?? ""} />
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          {(departmentRole === "ceo" || (!departmentRole && isAdmin)) && <CeoView />}
          {departmentRole === "ops_manager" && <OpsManagerView />}
          {departmentRole && departmentRole !== "ceo" && departmentRole !== "ops_manager" && (
            <DepartmentMemberView role={departmentRole as Exclude<DepartmentRole, "ceo" | "ops_manager">} />
          )}
        </main>
      </div>
    </div>
  );
}

function Sidebar({ role, email }: { role: DepartmentRole; email: string }) {
  const canManage = role === "ceo";
  const meta = role === "ceo"
    ? { label: "CEO", color: "#C9A84C" }
    : { label: DEPARTMENTS[role as keyof typeof DEPARTMENTS].label, color: DEPARTMENTS[role as keyof typeof DEPARTMENTS].color };
  return (
    <aside
      className="lg:w-60 lg:min-h-screen p-4 lg:p-6 flex lg:flex-col gap-4 items-center lg:items-start justify-between lg:justify-start"
      style={{ background: "#0D2B55", color: "white" }}
    >
      <Link to="/" className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5" style={{ color: "#C9A84C" }} />
        <span className="font-serif text-lg">Genlink Ops</span>
      </Link>
      <div className="hidden lg:block mt-6">
        <div className="text-[10px] uppercase tracking-widest text-white/50">Role</div>
        <div
          className="mt-1 inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: meta.color, color: "#0D2B55" }}
        >
          {meta.label}
        </div>
        <div className="text-xs text-white/60 mt-4 break-words">{email}</div>
      </div>
      {canManage && (
        <div className="hidden lg:flex flex-col gap-1 mt-6 w-full">
          <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Manage</div>
          <Link to="/team-management" className="flex items-center gap-2 text-sm text-white/85 hover:text-white py-1.5 px-2 rounded hover:bg-white/10">
            <Users className="w-4 h-4" /> Team Management
          </Link>
        </div>
      )}
      <div className="lg:mt-auto flex flex-col gap-2 items-start">
        <Link to="/journey" className="text-xs text-white/70 hover:text-white">← Back to Journey</Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => supabase.auth.signOut()}
          className="text-white/80 hover:text-white hover:bg-white/10 px-2"
        >
          <LogOut className="w-3.5 h-3.5 mr-1" /> Sign out
        </Button>
      </div>
    </aside>
  );
}