import { useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";

interface Props {
  to: string;
  glyphs?: string[];
  className?: string;
  children: ReactNode;
  /** Hex color for burst glyphs (preferred). */
  color?: string;
  /** Fallback: HSL hue if no color given. */
  hue?: number;
}

/** Journey-map landmark link. Zooms in, particles rush, then navigates. <1s total. */
export default function PillarZoomLink({ to, glyphs = ["✦"], className = "", hue = 45, color, children }: Props) {
  const tint = color ?? `hsl(${hue} 100% 65%)`;
  const glow = color ?? `hsl(${hue} 100% 55%)`;
  const navigate = useNavigate();
  const [zooming, setZooming] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { navigate(to); return; }
    setZooming(true);
    window.setTimeout(() => navigate(to), 780);
  };

  return (
    <>
      <a href={to} onClick={handleClick} className={className}>
        <span className={zooming ? "inline-block pillar-zoom-out" : "inline-block"}>{children}</span>
      </a>
      {zooming && (
        <div className="fixed inset-0 pointer-events-none z-[9997] overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * Math.PI * 2;
            const dist = 300 + (i % 5) * 60;
            return (
              <span key={i} className="absolute left-1/2 top-1/2 text-2xl"
                style={{
                  color: tint,
                  textShadow: `0 0 12px ${glow}`,
                  transform: "translate(-50%, -50%)",
                  animation: `zoom-burst 0.8s var(--ease-cinematic) both`,
                  ["--tx" as never]: `${Math.cos(angle) * dist}px`,
                  ["--ty" as never]: `${Math.sin(angle) * dist}px`,
                }}>
                {glyphs[i % glyphs.length]}
              </span>
            );
          })}
          <style>{`
            @keyframes zoom-burst {
              0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
              20%  { opacity: 1; }
              100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.4); opacity: 0; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}