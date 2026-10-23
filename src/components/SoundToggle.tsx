import { Volume2, VolumeX } from "lucide-react";
import { useSoundPref } from "@/lib/journeySound";
import { cn } from "@/lib/utils";

export default function SoundToggle({ className }: { className?: string }) {
  const [on, set] = useSoundPref();
  return (
    <button
      type="button"
      onClick={() => set(!on)}
      aria-label={on ? "Mute journey sounds" : "Unmute journey sounds"}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-full",
        "text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors",
        className,
      )}
    >
      {on ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
    </button>
  );
}