import { useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * Route transition. Wraps the app's <Routes>.
 * Incoming page: fade + rise 24px→0 (CSS, transform/opacity only).
 * Thin gold progress line sweeps across the top on each navigation.
 *
 * The previous implementation held the *outgoing* page in state for a
 * 260ms exit animation before swapping: every navigation -- even to an
 * already-loaded page -- waited that long before the new page existed,
 * and rapid page switching raced the timeout (stale page shown, double
 * renders, focus lost mid-click). That fixed delay was most of the
 * "switching pages lags" report. The swap is now immediate: React renders
 * the new route at once, keyed by pathname so the enter animation replays,
 * and nothing is ever held back for effect.
 */
export default function RouteTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const firstKey = useRef(location.key);

  return (
    <>
      {location.key !== firstKey.current && (
        <span key={location.key} className="route-progress" aria-hidden />
      )}
      <div key={location.pathname} className="route-enter">{children}</div>
    </>
  );
}
