import { Link } from "react-router-dom";
import StickyNav from "@/components/StickyNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useLearnerInsights } from "@/hooks/useLearningPlan";
import { pillars } from "@/data/courses";

const LearnerInsights = () => {
  const { isAdmin, departmentRole, loading: roleLoading } = useUserRole();
  const canView = isAdmin || departmentRole === "ceo";
  const { data: rows = [], isLoading, error } = useLearnerInsights();

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-cinematic-surface">
        <StickyNav />
        <p className="pt-32 text-center text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="min-h-screen bg-cinematic-surface">
        <StickyNav />
        <div className="container mx-auto px-4 pt-32 max-w-md text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-semibold text-foreground">Restricted</h1>
          <p className="text-muted-foreground">
            Learner insights are available to the CEO and platform admins only.
          </p>
          <Button asChild variant="outline">
            <Link to="/journey">Back to journey</Link>
          </Button>
        </div>
      </div>
    );
  }

  const pillarName = (id: string | null) =>
    id ? pillars.find((p) => p.id === id)?.name ?? id : "No plan yet";

  const active = rows.filter((r) => r.units_completed > 0).length;
  const totalXp = rows.reduce((a, r) => a + (r.total_xp ?? 0), 0);

  return (
    <div className="min-h-screen bg-cinematic-surface">
      <StickyNav />
      <main className="container mx-auto px-4 pt-28 pb-20 max-w-5xl">
        <h1 className="text-3xl font-bold text-foreground mb-1">Learner Insights</h1>
        <p className="text-muted-foreground mb-8">
          Where learners are in their plans, and what they've actually completed.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Learners", value: rows.length },
            { label: "With progress", value: active },
            { label: "Total XP earned", value: totalXp },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {isLoading && <p className="text-muted-foreground">Loading learners…</p>}
        {error && (
          <p className="text-destructive text-sm">
            Could not load learner insights. You may not have permission.
          </p>
        )}

        {!isLoading && !error && (
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3">Learner</th>
                  <th className="p-3">Plan pillar</th>
                  <th className="p-3">Units done</th>
                  <th className="p-3">XP</th>
                  <th className="p-3">Last active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id} className="border-b border-border/50 last:border-0">
                    <td className="p-3">
                      <div className="font-medium text-foreground">{r.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">{pillarName(r.pillar_id)}</td>
                    <td className="p-3">{r.units_completed}</td>
                    <td className="p-3">{r.total_xp ?? 0}</td>
                    <td className="p-3 text-muted-foreground">
                      {r.last_activity ? (
                        new Date(r.last_activity).toLocaleDateString()
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Never</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No learners yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default LearnerInsights;
