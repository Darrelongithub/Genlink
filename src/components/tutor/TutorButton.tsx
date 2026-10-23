import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import LightGuide from "./LightGuide";
import TutorPanel from "./TutorPanel";
import "./lightGuide.css";
import type { TutorContext } from "./LightGuideProvider";
import { HINTS, type RouteInfo } from "./routeContext";

interface Props {
  route: RouteInfo;
  pageContext: TutorContext | null;
}

export default function TutorButton({ route, pageContext }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const orbRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  const hintKey = `lg-hint:${user?.id ?? "anon"}:${route.route_name}`;
  useEffect(() => {
    const text = HINTS[route.route_name];
    setHint(text && !localStorage.getItem(hintKey) ? text : null);
  }, [hintKey, route.route_name]);
  const dismissHint = () => { localStorage.setItem(hintKey, "1"); setHint(null); };

  useEffect(() => {
    document.body.classList.toggle("light-guide-open", open);
    return () => document.body.classList.remove("light-guide-open");
  }, [open]);

  // Return focus to the orb after the panel closes.
  useEffect(() => {
    if (wasOpen.current && !open) requestAnimationFrame(() => orbRef.current?.focus({ preventScroll: true }));
    wasOpen.current = open;
  }, [open]);

  const openPanel = () => { if (hint) dismissHint(); setOpen(true); };

  return (
    <>
      {!open && (
        <>
          {hint && (
            <div role="status" className="light-guide-hint fixed z-40 max-w-[240px] rounded-2xl rounded-br-sm border border-premium/40 bg-primary px-3.5 py-2.5 pr-8 text-xs text-primary-foreground shadow-xl">
              <button type="button" onClick={openPanel} className="text-left">{hint}</button>
              <button type="button" onClick={dismissHint} aria-label="Dismiss hint" className="absolute right-1.5 top-1.5 rounded p-1 text-primary-foreground/70 hover:text-primary-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <Button
            ref={orbRef}
            variant="ghost"
            size="icon"
            onClick={openPanel}
            aria-label="Open Light Guide"
            aria-haspopup="dialog"
            className="light-guide-launcher fixed z-40 h-16 w-16 rounded-full p-0 transition-transform hover:scale-110 hover:bg-transparent focus-visible:ring-premium motion-reduce:transition-none motion-reduce:hover:scale-100"
          >
            <LightGuide size={64} />
          </Button>
        </>
      )}
      <TutorPanel open={open} onClose={() => setOpen(false)} route={route} pageContext={pageContext} />
    </>
  );
}
