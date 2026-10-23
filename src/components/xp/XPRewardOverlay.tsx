import { useEffect } from "react";
import { Sparkles, Award, X } from "lucide-react";
import { useXPReward } from "@/contexts/XPRewardContext";

/**
 * Single, app-wide overlay that renders:
 *  - floating "+XP" numbers
 *  - full-screen Level Up celebration
 *  - badge unlock slide-in card
 *
 * Pure CSS animations (defined inline) — no external libs.
 */
const XPRewardOverlay = () => {
  const { floaters, showLevelUp, levelUpValue, badge, dismissBadge } = useXPReward();

  // Auto-dismiss badge after 5s
  useEffect(() => {
    if (!badge) return;
    const t = window.setTimeout(dismissBadge, 5000);
    return () => window.clearTimeout(t);
  }, [badge, dismissBadge]);

  return (
    <>
      <style>{`
        @keyframes xp-float {
          0%   { opacity: 0; transform: translate(-50%, 0) scale(0.8); }
          15%  { opacity: 1; transform: translate(-50%, -8px) scale(1.05); }
          100% { opacity: 0; transform: translate(-50%, -70px) scale(1); }
        }
        @keyframes xp-burst {
          0%   { opacity: 0; transform: scale(0.2); }
          40%  { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(2.6); }
        }
        @keyframes xp-burst-ring {
          0%   { opacity: 0.9; transform: scale(0.3); }
          100% { opacity: 0;   transform: scale(3.2); }
        }
        @keyframes xp-pop-in {
          0%   { opacity: 0; transform: scale(0.6); }
          60%  { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes xp-slide-in-right {
          0%   { opacity: 0; transform: translateX(120%); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes xp-fade-bg {
          0%   { opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
        .xp-floater { animation: xp-float 1.4s ease-out forwards; will-change: transform, opacity; }
        .xp-burst-bg { animation: xp-fade-bg 2s ease-out forwards; will-change: opacity; }
        .xp-burst-core { animation: xp-pop-in 0.5s cubic-bezier(.2,.9,.3,1.4) forwards; will-change: transform, opacity; }
        .xp-burst-ring { animation: xp-burst-ring 1.6s ease-out forwards; will-change: transform, opacity; }
        .xp-burst-ring.delay-1 { animation-delay: 0.2s; }
        .xp-burst-ring.delay-2 { animation-delay: 0.45s; }
        .xp-badge-card { animation: xp-slide-in-right 0.45s cubic-bezier(.2,.9,.3,1.2) forwards; will-change: transform, opacity; }
      `}</style>

      {/* Floaters */}
      <div className="pointer-events-none fixed inset-0 z-[100]">
        {floaters.map((f) => (
          <div
            key={f.id}
            className="xp-floater absolute font-bold text-base sm:text-lg"
            style={{
              left: f.x,
              top: f.y,
              color: "#C9A84C",
              textShadow: "0 2px 6px rgba(0,0,0,0.35)",
            }}
          >
            +{f.amount} XP
          </div>
        ))}
      </div>

      {/* Level Up overlay */}
      {showLevelUp && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none"
          aria-live="polite"
          role="status"
        >
          <div className="xp-burst-bg absolute inset-0 bg-black/60" />
          <div className="relative">
            <div
              className="xp-burst-ring absolute inset-0 rounded-full border-4"
              style={{ borderColor: "#C9A84C" }}
            />
            <div
              className="xp-burst-ring delay-1 absolute inset-0 rounded-full border-2"
              style={{ borderColor: "#F5D67A" }}
            />
            <div
              className="xp-burst-ring delay-2 absolute inset-0 rounded-full border-2"
              style={{ borderColor: "#C9A84C" }}
            />
            <div
              className="xp-burst-core relative px-8 py-6 sm:px-12 sm:py-8 rounded-2xl text-center"
              style={{
                background:
                  "radial-gradient(circle at 50% 30%, #F5D67A 0%, #C9A84C 55%, #8B6F2A 100%)",
                boxShadow:
                  "0 0 60px 10px rgba(201,168,76,0.65), 0 20px 60px rgba(0,0,0,0.45)",
              }}
            >
              <Sparkles className="mx-auto mb-2" size={36} color="#1B1B1B" />
              <div
                className="text-3xl sm:text-5xl font-extrabold tracking-tight"
                style={{ color: "#1B1B1B" }}
              >
                Level Up!
              </div>
              <div
                className="mt-1 text-sm sm:text-base font-semibold"
                style={{ color: "#1B1B1B", opacity: 0.85 }}
              >
                You reached Level {levelUpValue}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badge unlock */}
      {badge && (
        <div className="fixed top-20 right-4 sm:right-6 z-[105] max-w-xs w-[min(92vw,22rem)]">
          <div
            className="xp-badge-card relative flex items-start gap-3 rounded-xl p-4 pr-9 shadow-2xl"
            style={{
              background:
                "linear-gradient(135deg, #1B2A4A 0%, #243B6B 100%)",
              borderLeft: "4px solid #C9A84C",
            }}
            role="status"
            aria-live="polite"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "#C9A84C" }}
            >
              <Award size={22} color="#1B2A4A" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "#C9A84C" }}>
                Badge unlocked
              </div>
              <div className="text-sm font-bold text-white truncate">{badge.name}</div>
              <div className="text-xs text-white/75 line-clamp-2">{badge.description}</div>
            </div>
            <button
              type="button"
              onClick={dismissBadge}
              className="absolute top-2 right-2 text-white/60 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default XPRewardOverlay;