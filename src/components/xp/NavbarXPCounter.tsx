import { useEffect } from "react";
import { Zap } from "lucide-react";
import { useUserXP, calculateLevel } from "@/hooks/useUserProgress";
import { useXPReward } from "@/contexts/XPRewardContext";
import { useTiers, tierFor } from "@/hooks/usePlatformXp";

/**
 * Compact XP/level pill for the navbar.
 * Reflects the animated counter from XPRewardContext, syncing whenever the
 * server-side user_xp row changes.
 */
const NavbarXPCounter = () => {
  const { data: userXP } = useUserXP();
  const { displayedXP, level, setBaseline } = useXPReward();
  const { data: tiers } = useTiers();
  const tier = tierFor(displayedXP, tiers);

  // Sync with server-truth on load and after invalidations.
  useEffect(() => {
    if (!userXP) return;
    setBaseline(userXP.total_xp, userXP.current_level ?? calculateLevel(userXP.total_xp));
  }, [userXP, setBaseline]);

  if (!userXP) return null;

  return (
    <div
      data-xp-counter
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold"
      style={{
        background: "rgba(201,168,76,0.12)",
        color: "#C9A84C",
        border: "1px solid rgba(201,168,76,0.35)",
      }}
      aria-label={`${tier ? `${tier} tier, ` : ""}Level ${level}, ${displayedXP} total XP`}
    >
      <Zap size={14} fill="#C9A84C" />
      <span className="tabular-nums">{displayedXP.toLocaleString()}</span>
      <span className="opacity-60">·</span>
      <span>Lvl {level}</span>
      {tier && (<><span className="opacity-60">·</span><span>{tier}</span></>)}
    </div>
  );
};

export default NavbarXPCounter;