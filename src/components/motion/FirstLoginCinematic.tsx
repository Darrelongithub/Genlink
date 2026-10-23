import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_PREFIX = "genlink:firstLoginCinematic:";

/** One-time welcome cinematic. ~7s, skippable. Per-user localStorage flag. */
export default function FirstLoginCinematic() {
  const auth = useAuth() as any;
  const user = auth?.user;
  const profile = auth?.profile;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const key = STORAGE_PREFIX + user.id;
    if (localStorage.getItem(key)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    localStorage.setItem(key, "1");
    if (reduce) return;
    setVisible(true);
  }, [user?.id]);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(false), 7200);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  const firstName =
    profile?.full_name?.split(" ")[0] ??
    profile?.first_name ??
    user?.email?.split("@")[0] ??
    "Welcome";

  return (
    <div
      role="dialog"
      aria-label="Welcome cinematic"
      onClick={() => setVisible(false)}
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center cursor-pointer"
      style={{
        background: "radial-gradient(ellipse at center, hsl(220 70% 10%) 0%, hsl(220 75% 5%) 70%, #000 100%)",
        animation: "cinematic-rise 0.6s var(--ease-cinematic) both",
      }}
    >
      <div className="text-center px-6" style={{ animation: "cinematic-rise 1.2s var(--ease-cinematic) both" }}>
        <h1
          className="text-5xl md:text-7xl"
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            color: "hsl(45 100% 75%)",
            letterSpacing: "0.01em",
            textShadow: "0 0 40px hsl(45 100% 55% / 0.45)",
          }}
        >
          {firstName}
        </h1>
        <p
          className="mt-6 text-lg md:text-xl tracking-wide"
          style={{
            color: "hsl(180 60% 88%)",
            animation: "cinematic-rise 1s var(--ease-cinematic) 1.4s both",
            opacity: 0,
          }}
        >
          Your journey begins
        </p>
      </div>

      <svg viewBox="0 0 800 200" className="mt-16 w-[85%] max-w-3xl"
        style={{ animation: "cinematic-rise 0.8s var(--ease-cinematic) 2.4s both", opacity: 0 }}>
        <defs>
          <linearGradient id="road-grad" x1="0" x2="1">
            <stop offset="0%" stopColor="hsl(45 100% 55%)" />
            <stop offset="100%" stopColor="hsl(180 75% 55%)" />
          </linearGradient>
        </defs>
        <path
          d="M 20 150 C 150 40, 300 180, 450 90 S 700 150, 780 60"
          fill="none" stroke="url(#road-grad)" strokeWidth="3" strokeLinecap="round"
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "road-draw 1.5s var(--ease-cinematic) 2.6s forwards" }}
        />
        {[
          { cx: 20, cy: 150, delay: 2.7 },
          { cx: 240, cy: 105, delay: 3.1 },
          { cx: 450, cy: 90,  delay: 3.5 },
          { cx: 640, cy: 118, delay: 3.9 },
          { cx: 780, cy: 60,  delay: 4.2 },
        ].map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={6} fill="hsl(45 100% 65%)"
            style={{ opacity: 0, animation: `cinematic-rise 0.5s var(--ease-cinematic) ${p.delay}s forwards`,
              filter: "drop-shadow(0 0 8px hsl(45 100% 55% / 0.8))" }} />
        ))}
      </svg>

      <button
        className="absolute bottom-8 right-8 text-xs uppercase tracking-widest text-white/50 hover:text-white/90 transition"
        onClick={(e) => { e.stopPropagation(); setVisible(false); }}
      >
        Skip ▸
      </button>

      <style>{`@keyframes road-draw { to { stroke-dashoffset: 0; } }`}</style>
    </div>
  );
}