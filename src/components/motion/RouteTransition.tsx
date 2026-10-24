import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * Cinematic route transition. Wraps the app's <Routes>.
 * Outgoing: fade + drift down 12px (0.3s).
 * Incoming: fade + rise 24px→0 (0.5s).
 * Thin gold progress line sweeps across the top during the change.
 */
export default function RouteTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [displayed, setDisplayed] = useState(children);
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const [progressKey, setProgressKey] = useState(0);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setPhase("exit");
    setProgressKey((k) => k + 1);
    const t = window.setTimeout(() => {
      setDisplayed(children);
      setPhase("enter");
    }, 260);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (phase === "enter") setDisplayed(children);
  }, [children, phase]);

  return (
    <>
      {progressKey > 0 && <span key={progressKey} className="route-progress" aria-hidden />}
      <div className={phase === "enter" ? "route-enter" : "route-exit"}>{displayed}</div>
    </>
  );
}