import { useEffect, useState } from "react";
import { ArrowRight, ExternalLink, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAdaptUrl } from "@/lib/adapt";

const DEFAULT_DELAY_MS = 90_000;

function checkInDelay(): number {
  const configured = Number(import.meta.env.VITE_ADAPT_CHECKIN_DELAY_MS);
  return Number.isFinite(configured) && configured >= 1_000 ? configured : DEFAULT_DELAY_MS;
}

function wasPrompted(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markPrompted(key: string): void {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // A storage-restricted browser can still use the prompt for this visit.
  }
}

/**
 * Genlink's hand-off for a learner who has gone quiet in a lesson.
 *
 * Genlink does not invent a second adaptation system. It only notices a quiet
 * reading session and sends the learner to Adapt, where the actual check-in,
 * evidence, tests and next-lesson decision live. The prompt is intentionally
 * once per lesson and never blocks the learner from continuing.
 */
export default function AdaptCheckInPrompt({ sessionKey }: { sessionKey: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = `genlink:adapt-check-in:${sessionKey}`;
    if (wasPrompted(key)) return;

    let lastActivity = Date.now();
    const delay = checkInDelay();
    const onActivity = () => {
      lastActivity = Date.now();
    };
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity < delay) return;
      markPrompted(key);
      setOpen(true);
      window.clearInterval(timer);
    }, 5_000);

    window.addEventListener("scroll", onActivity, { passive: true });
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("scroll", onActivity);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [sessionKey]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md border-[#C9A84C]/35 bg-gradient-to-br from-card to-muted/50">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C9A84C]/15 text-[#A98223]">
            <HeartHandshake className="h-6 w-6" aria-hidden="true" />
          </div>
          <DialogTitle className="text-2xl text-foreground">Everything okay?</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            You have been on this lesson for a little while. No pressure to rush — ADAPT can check in,
            run a short test, and shape the next lesson around what would help.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Genlink remains your learning home. ADAPT is the engine for the check-in and adaptive tests,
            so your answers stay in the right place while the engine is still being prepared.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              I&apos;m okay, keep reading
            </Button>
            <Button asChild className="bg-[#C9A84C] text-[#0F1B33] hover:bg-[#C9A84C]/90">
              <a href={getAdaptUrl("/")}>
                Open ADAPT engine
                <ArrowRight className="ml-2 h-4 w-4" />
                <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
