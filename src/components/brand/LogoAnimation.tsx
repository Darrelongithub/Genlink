import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./brand.css";

const SPLASH_KEY = "gl_splash";
const SPLASH_MS = 2200;
const LOADER_DELAY_MS = 150;
const LOADER_MIN_MS = 450;

/** Routes where the splash may play: public marketing + auth surfaces. */
const SPLASH_ROUTES = ["/", "/auth", "/forgot-password", "/reset-password", "/pathway-intelligence"];

function LogoLayers() {
  return (
    <div className="gl-logo" aria-hidden="true">
      <div className="gl-markwrap">
        <img className="gl-mark" alt="" src="/brand/genlink-mark.png" />
      </div>
      <img className="gl-word" alt="" src="/brand/genlink-wordmark.png" />
      <img className="gl-tag" alt="" src="/brand/genlink-tagline.png" />
    </div>
  );
}

/**
 * Splash: plays once per browser session on the first load of a public/auth
 * route. ~2.2s, skipped by tap/click/Esc. Overlays the app but never blocks
 * navigation and never replays on route changes.
 */
export function LogoSplash() {
  const { pathname } = useLocation();
  const [state, setState] = useState<"hidden" | "play" | "exit">(() => {
    if (typeof window === "undefined") return "hidden";
    if (!SPLASH_ROUTES.includes(window.location.pathname)) return "hidden";
    if (sessionStorage.getItem(SPLASH_KEY)) return "hidden";
    return "play";
  });
  const exitTimer = useRef<number>();
  const hideTimer = useRef<number>();

  const exit = () => {
    setState((s) => {
      if (s !== "play") return s;
      window.clearTimeout(exitTimer.current);
      return "exit";
    });
  };

  // After the exit animation completes, remove the overlay entirely.
  useEffect(() => {
    if (state !== "exit") return;
    hideTimer.current = window.setTimeout(() => setState("hidden"), 520);
    return () => window.clearTimeout(hideTimer.current);
  }, [state]);

  useEffect(() => {
    if (state !== "play") return;
    sessionStorage.setItem(SPLASH_KEY, "1");
    exitTimer.current = window.setTimeout(exit, SPLASH_MS);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") exit(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(exitTimer.current);
      window.clearTimeout(hideTimer.current);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Never replay on navigation: once dismissed it stays dismissed.
  useEffect(() => {
    if (state === "play" && !SPLASH_ROUTES.includes(pathname)) exit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (state === "hidden") return null;
  return (
    <div
      className={`gl-splash gl-play ${state === "exit" ? "gl-exit" : ""}`}
      onClick={exit}
      role="button"
      aria-label="Skip intro"
    >
      <LogoLayers />
    </div>
  );
}

/**
 * Route loader: the orbiting mark. Shown only when a navigation (or a lazy
 * route inside Suspense) takes longer than 150ms, then stays visible at least
 * 450ms so it never flickers. Fast routes keep the thin gold progress line
 * from RouteTransition instead.
 */
export function RouteLoader() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<number>();
  const shownAt = useRef<number>(0);

  // When the path changes, arm the loader to appear after 150ms.
  useEffect(() => {
    showTimer.current = window.setTimeout(() => {
      shownAt.current = performance.now();
      setVisible(true);
    }, LOADER_DELAY_MS);
    return () => window.clearTimeout(showTimer.current);
  }, [pathname]);

  // Once the new route has committed, hide — but never before 450ms of visibility.
  useEffect(() => {
    if (!visible) return;
    const elapsed = performance.now() - shownAt.current;
    const remaining = Math.max(0, LOADER_MIN_MS - elapsed);
    const t = window.setTimeout(() => setVisible(false), remaining);
    return () => window.clearTimeout(t);
  }, [visible, pathname]);

  return (
    <div className={`gl-loader ${visible ? "gl-on" : ""}`} aria-hidden={!visible} role="status" aria-label="Loading">
      <div className="gl-lm">
        <img alt="" src="/brand/genlink-mark.png" />
      </div>
    </div>
  );
}

/** Suspense fallback for lazy routes — same loader, shown immediately by Suspense. */
export function RouteLoaderFallback() {
  return (
    <div className="gl-loader gl-on" role="status" aria-label="Loading">
      <div className="gl-lm">
        <img alt="" src="/brand/genlink-mark.png" />
      </div>
    </div>
  );
}
