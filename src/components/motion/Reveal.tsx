import { createElement, useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";

interface Props {
  children: ReactNode;
  index?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  style?: CSSProperties;
  onScroll?: boolean;
}

/** Reveal-on-scroll: fade + rise 30px→0 with ease-cinematic. Fires once. */
export default function Reveal({
  children, index = 0, className = "", as: Tag = "div", style, onScroll = true,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(!onScroll);

  useEffect(() => {
    if (!onScroll || shown) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { setShown(true); io.disconnect(); break; }
      }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [onScroll, shown]);

  const s: CSSProperties = shown ? { animationDelay: `${index * 70}ms`, ...style } : (style ?? {});
  return createElement(
    Tag as string,
    {
      ref,
      className: `${shown ? "reveal-in" : "reveal-init"} ${className}`,
      style: s,
    },
    children,
  );
}