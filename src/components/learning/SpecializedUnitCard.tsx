import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Unit, PillarTheme } from "@/hooks/useUnits";

const ACCENT: Record<PillarTheme, string> = {
  financial: "bg-blue-600",
  communication: "bg-rose-600",
  digital: "bg-cyan-600",
  leadership: "bg-violet-600",
  entrepreneurship: "bg-emerald-600",
  creator: "bg-orange-600",
  civic: "bg-amber-600",
};

export default function SpecializedUnitCard({ unit, pillarId }: { unit: Unit; pillarId: string }) {
  return (
    <Link
      to={`/pillar/${pillarId}/unit/${unit.id}`}
      className="block group rounded-lg border border-border bg-card hover:border-foreground/20 hover:shadow-md transition-all p-4 h-full"
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn("text-[10px] font-semibold uppercase tracking-wider text-white px-2 py-0.5 rounded-full", ACCENT[unit.theme])}>
          Bonus
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
          <Sparkles className="w-3 h-3" />
          {unit.total_xp} XP
        </span>
      </div>
      <h4 className="font-semibold text-sm leading-snug line-clamp-2 mb-1 group-hover:text-foreground">
        {unit.title}
      </h4>
      {unit.description && (
        <p className="text-xs text-muted-foreground line-clamp-1">{unit.description}</p>
      )}
    </Link>
  );
}