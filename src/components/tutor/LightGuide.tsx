import { cn } from "@/lib/utils";

interface Props {
  size?: number;
  className?: string;
  intense?: boolean;
  /** Disable the gentle pulse loop. */
  static?: boolean;
}

/**
 * The Genlink Light Guide orb — one visual entity used by both the
 * Journey Map node-unlock animation and the AI Tutor avatar/button.
 */
export default function LightGuide({ size = 56, className, intense, static: isStatic }: Props) {
  return (
    <span
      aria-hidden
      className={cn("lg-orb inline-block relative", !isStatic && "lg-breathe", intense && "lg-intense", className)}
      style={{ width: size, height: size }}
    >
      <span className="lg-core" />
      <span className="lg-halo" />
    </span>
  );
}