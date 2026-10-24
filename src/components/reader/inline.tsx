import React from "react";

/**
 * Render **bold**, *italic*, and `code` markers inline. Deliberately minimal — anything
 * fancier belongs in a real block type, not inline markup.
 */
export function Inline({ text }: { text: string }) {
  const parts = React.useMemo(() => {
    const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
    return tokens.map((t, i) => {
      if (/^`[^`]+`$/.test(t)) {
        return <code key={i} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[0.88em] text-primary">{t.slice(1, -1)}</code>;
      }
      if (/^\*\*[^*]+\*\*$/.test(t)) return <strong key={i}>{t.slice(2, -2)}</strong>;
      if (/^\*[^*]+\*$/.test(t)) return <em key={i}>{t.slice(1, -1)}</em>;
      return <React.Fragment key={i}>{t}</React.Fragment>;
    });
  }, [text]);
  return <>{parts}</>;
}