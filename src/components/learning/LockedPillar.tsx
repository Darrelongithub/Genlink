import { Link } from "react-router-dom";
import { Lock, ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { previewHref, type PillarAccess } from "@/hooks/usePillarAccess";

/** Friendly screen for direct links into a pillar the learner hasn't unlocked yet. */
export default function LockedPillar({ access, color }: { access: PillarAccess; color: string }) {
  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground">
        <Link to="/courses"><ArrowLeft className="w-4 h-4 mr-2" />All Pillars</Link>
      </Button>
      <div className="rounded-2xl border bg-card p-8 text-center" style={{ borderColor: `${color}55` }}>
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: `${color}22`, color }}>
          <Lock className="w-6 h-6" />
        </div>
        <p className="text-xs uppercase tracking-widest text-accent mb-2">
          {access.track === "foundation" ? `Foundation · Pillar ${access.order_index}` : `Specialisation · Pillar ${access.order_index}`}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{access.name} is not open yet</h1>
        <p className="text-sm text-muted-foreground mb-8">
          {access.track === "foundation"
            ? "Finish Personal Mastery first. It is the base the rest of the Foundation builds on."
            : "Specialisations open once you have built the Foundation. Here is where you stand:"}
        </p>
        <ul className="space-y-4 text-left mb-8">
          {access.requirements.map((r) => (
            <li key={r.pillar_id}>
              <div className="flex justify-between text-sm mb-1">
                <span>Pillar {r.order_index}: {r.name}</span>
                <span className="text-muted-foreground">{r.current_pct}% of {r.required_pct}%</span>
              </div>
              <Progress value={Math.min(100, (r.current_pct / Math.max(1, r.required_pct)) * 100)} className="h-2 bg-muted [&>div]:bg-accent" />
            </li>
          ))}
        </ul>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link to={previewHref(access)}><Eye className="w-4 h-4 mr-2" />Preview first session</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/journey">Back to my journey</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
