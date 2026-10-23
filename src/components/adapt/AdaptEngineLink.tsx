import { ExternalLink, Sparkles } from "lucide-react";
import { ADAPT_ENTRY_PATH, getAdaptUrl, ADAPT_ENGINE_NAME } from "@/lib/adapt";

interface AdaptEngineLinkProps {
  className?: string;
  mobile?: boolean;
  onNavigate?: () => void;
}

/** The single hand-off point from the Genlink shell to the Adapt UI. */
export default function AdaptEngineLink({ className = "", mobile = false, onNavigate }: AdaptEngineLinkProps) {
  return (
    <a
      href={getAdaptUrl(ADAPT_ENTRY_PATH)}
      onClick={onNavigate}
      className={className}
      aria-label="Open the ADAPT three-game demo"
    >
      <span className="inline-flex items-center gap-1.5">
        <Sparkles className={mobile ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden="true" />
        <span>{ADAPT_ENGINE_NAME}</span>
        <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
      </span>
    </a>
  );
}
