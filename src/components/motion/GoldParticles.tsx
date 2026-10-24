import { useEffect, useMemo, useState } from "react";

interface Props { count?: number; className?: string; opacity?: number; }

/**
 * Ambient gold particle field. GPU-only, 20-30s drift loops.
 * Default opacity is intentionally low (0.10) so it reads as texture, not decor.
 * Fully disabled under prefers-reduced-motion.
 */
export default function GoldParticles({ count = 28, className = "", opacity = 0.10 }: Props) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      const rnd = (n: number) => ((seed * (n + 1)) % 1000) / 1000;
      return {
        left: `${rnd(1) * 100}%`,
        top: `${rnd(2) * 100}%`,
        size: 2 + rnd(3) * 3,
        duration: 20 + rnd(4) * 12,
        delay: -rnd(5) * 30,
        dir: i % 2 === 0 ? "gold-drift-a" : "gold-drift-b",
        o: 0.4 + rnd(6) * 0.6,
      };
    });
  }, [count]);

  if (reduced) return null;

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{ opacity }}>
      {particles.map((p, i) => (
        <span key={i} className="absolute rounded-full" style={{
          left: p.left, top: p.top, width: p.size, height: p.size,
          background: "radial-gradient(circle, hsl(45 100% 65% / 0.95), hsl(45 100% 55% / 0) 70%)",
          opacity: p.o,
          animation: `${p.dir} ${p.duration}s linear ${p.delay}s infinite alternate`,
          willChange: "transform",
        }} />
      ))}
    </div>
  );
}