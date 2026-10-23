import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Copy, Check, Lightbulb, MapPin, Sparkles, ListChecks, Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { SessionBlock, CalloutVariant } from "@/lib/blocks/types";
import { READER } from "./readerTheme";
import { Inline } from "./inline";

interface RendererProps {
  block: SessionBlock;
  index: number;
  onAwardReflection?: (blockKey: string) => Promise<void>;
  onAwardExercise?: (blockKey: string) => Promise<void>;
}

/**
 * Fade + rise a block into view when it first intersects the viewport.
 * Staggered by (index * 60ms) so a long page still feels calm on scroll.
 */
function useReveal<T extends HTMLElement>(delayMs: number) {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setShown(true)),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const style: React.CSSProperties = {
    opacity: shown ? 1 : 0,
    transform: shown ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 480ms ease-out ${delayMs}ms, transform 480ms ease-out ${delayMs}ms`,
  };
  return { ref, style };
}

export default function BlockRenderer({ block, index, onAwardReflection, onAwardExercise }: RendererProps) {
  const stagger = Math.min(index, 8) * 60;
  const { ref, style } = useReveal<HTMLDivElement>(stagger);

  return (
    <div ref={ref} style={style}>
      <BlockBody block={block} index={index} onAwardReflection={onAwardReflection} onAwardExercise={onAwardExercise} />
    </div>
  );
}

function BlockBody({ block, index, onAwardReflection, onAwardExercise }: RendererProps) {
  const c = block.content as any;
  switch (block.block_type) {
    case "heading":       return <HeadingBlock level={c.level ?? 1} text={c.text ?? ""} />;
    case "paragraph":     return <ParagraphBlock text={c.text ?? ""} />;
    case "callout":       return <CalloutBlock variant={c.variant ?? "key_idea"} title={c.title} body={c.body ?? ""} />;
    case "quote":         return <QuoteBlock text={c.text ?? ""} attribution={c.attribution} />;
    case "table":         return <TableBlock headers={c.headers ?? []} rows={c.rows ?? []} />;
    case "warning":       return <WarningBlock title={c.title} body={c.body ?? ""} />;
    case "reflection":    return <ReflectionBlock number={c.number} prompt={c.prompt ?? ""} blockKey={`r${block.id ?? index}`} onAward={onAwardReflection} />;
    case "exercise":      return <ExerciseBlock title={c.title} steps={c.steps ?? []} xp={c.xp ?? 150} blockKey={`e${block.id ?? index}`} onAward={onAwardExercise} />;
    case "video":         return <VideoBlock url={c.url} caption={c.caption} />;
    case "image":         return <ImageBlock url={c.url} alt={c.alt} caption={c.caption} />;
    case "divider":       return <DividerBlock />;
    case "key_terms":     return <KeyTermsBlock terms={c.terms ?? []} />;
    case "stat_grid":     return <StatGridBlock stats={c.stats ?? []} />;
    case "code":          return <CodeBlock code={c.code ?? ""} language={c.language} />;
    default:              return null;
  }
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy code");
    }
  };
  return (
    <div className="my-8 overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-lg">
      <div className="flex min-h-10 items-center justify-between border-b border-primary-foreground/15 px-4 py-2">
        <span className="font-mono text-xs text-primary-foreground/70">{language || "code"}</span>
        <Button type="button" variant="ghost" size="sm" onClick={copy} className="h-7 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed"><code className="font-mono">{code}</code></pre>
    </div>
  );
}

// ---------------- individual block components ----------------

function HeadingBlock({ level, text }: { level: 1 | 2 | 3; text: string }) {
  const size = level === 1 ? "text-3xl md:text-4xl" : level === 2 ? "text-2xl md:text-3xl" : "text-xl md:text-2xl";
  const marginTop = level === 1 ? "mt-14 md:mt-16" : level === 2 ? "mt-10" : "mt-8";
  const Tag = (`h${level}` as unknown) as keyof JSX.IntrinsicElements;
  return (
    <div className={`${marginTop} mb-5`}>
      <Tag className={`${size} font-normal leading-tight`} style={{ fontFamily: READER.serif, color: READER.ink }}>
        {text}
      </Tag>
      {level === 1 && <span className="mt-3 block h-[3px] w-14 rounded-full" style={{ background: READER.gold }} />}
    </div>
  );
}

function ParagraphBlock({ text }: { text: string }) {
  return (
    <p className="mb-5" style={{ color: READER.ink, fontSize: 18, lineHeight: 1.7 }}>
      <Inline text={text} />
    </p>
  );
}

function CalloutBlock({ variant, title, body }: { variant: CalloutVariant; title?: string; body: string }) {
  if (variant === "ai_prompt") {
    return <AiPromptCallout title={title} body={body} />;
  }
  if (variant === "kenya_context") {
    return (
      <div className="rounded-xl my-8 p-5 md:p-6 border" style={{ background: READER.greenSoft, borderColor: `${READER.green}33` }}>
        <div className="flex items-center gap-2 mb-2" style={{ color: READER.green }}>
          <MapPin className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-widest font-semibold">{title ?? "Kenya context"}</span>
        </div>
        <p className="text-[16px] leading-relaxed" style={{ color: READER.ink }}>
          <Inline text={body} />
        </p>
      </div>
    );
  }
  // key_idea
  return (
    <div className="my-8 rounded-r-xl p-5 md:p-6 border-l-4" style={{ background: READER.paper, borderLeftColor: READER.gold }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: READER.gold }}>
        <Lightbulb className="w-4 h-4" />
        <span className="text-[11px] uppercase tracking-widest font-semibold">{title ?? "Key idea"}</span>
      </div>
      <p className="text-[17px] leading-relaxed" style={{ color: READER.ink }}>
        <Inline text={body} />
      </p>
    </div>
  );
}

function AiPromptCallout({ title, body }: { title?: string; body: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      toast.success("Prompt copied");
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  };
  return (
    <div className="my-8 rounded-2xl overflow-hidden" style={{ background: READER.navy, color: "white" }}>
      <div className="p-5 md:p-6 flex gap-4">
        <span
          className="shrink-0 w-9 h-9 rounded-full grid place-items-center"
          style={{ background: `${READER.gold}22`, color: READER.gold, boxShadow: `0 0 0 2px ${READER.gold}44 inset` }}
          aria-hidden
        >
          <Sparkles className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-widest mb-2" style={{ color: READER.gold }}>
            {title ?? "AI Prompt"}
          </div>
          <p className="text-[15px] leading-relaxed" style={{ fontFamily: READER.mono, color: "#F4EAD5" }}>
            {body}
          </p>
          <button
            type="button"
            onClick={copy}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            style={{ background: "rgba(255,255,255,0.08)", color: "white" }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuoteBlock({ text, attribution }: { text: string; attribution?: string }) {
  return (
    <blockquote className="my-10 px-4 md:px-8 relative">
      <span
        aria-hidden
        className="absolute -top-4 left-0 leading-none select-none"
        style={{ fontFamily: READER.serif, color: `${READER.gold}55`, fontSize: 96 }}
      >
        “
      </span>
      <p
        className="italic pl-8 md:pl-10 leading-snug"
        style={{ fontFamily: READER.serif, color: READER.ink, fontSize: 24 }}
      >
        {text}
      </p>
      {attribution && (
        <footer className="mt-4 pl-8 md:pl-10 text-[11px] uppercase tracking-[0.22em]" style={{ color: READER.inkSoft }}>
          — {attribution}
        </footer>
      )}
    </blockquote>
  );
}

function TableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-8 relative">
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: `${READER.navy}22` }}>
        <table className="w-full text-[15px] min-w-[520px]">
          <thead>
            <tr style={{ background: READER.navy, color: "white" }}>
              {headers.map((h, i) => (
                <th key={i} className="text-left px-4 py-3 font-semibold text-[13px] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 ? "white" : READER.cream }}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-3 align-top" style={{ color: READER.ink }}>
                    <Inline text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* right fade edge hint on mobile */}
      <div
        aria-hidden
        className="md:hidden pointer-events-none absolute top-0 right-0 h-full w-8 rounded-r-xl"
        style={{ background: `linear-gradient(to left, ${READER.cream}, transparent)` }}
      />
    </div>
  );
}

function WarningBlock({ title, body }: { title?: string; body: string }) {
  return (
    <div className="my-8 rounded-xl p-5 border" style={{ background: READER.amberSoft, borderColor: `${READER.amber}44` }}>
      <div className="flex gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: READER.amber }} />
        <div>
          {title && <div className="font-semibold mb-1" style={{ color: READER.amber }}>{title}</div>}
          <p className="leading-relaxed" style={{ color: READER.ink, fontSize: 16 }}>
            <Inline text={body} />
          </p>
        </div>
      </div>
    </div>
  );
}

function ReflectionBlock({
  number, prompt, blockKey, onAward,
}: { number?: number; prompt: string; blockKey: string; onAward?: (k: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async () => {
    if (!onAward) return;
    setBusy(true);
    try { await onAward(blockKey); setDone(true); } finally { setBusy(false); }
  };
  return (
    <div className="my-8 rounded-2xl p-5 md:p-6 border" style={{ background: READER.blueSoft, borderColor: `${READER.blue}33` }}>
      <div className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: READER.blue }}>
        Reflection{number ? ` ${number}` : ""}
      </div>
      <p className="text-[17px] leading-relaxed mb-3" style={{ color: READER.ink, fontFamily: READER.serif }}>
        {prompt}
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Your reflection…"
        className="bg-white mb-3 min-h-[110px]"
        disabled={done}
      />
      <Button
        onClick={submit}
        disabled={busy || done || text.trim().length < 5}
        style={{ background: READER.blue, color: "white" }}
      >
        {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
        {done ? "Submitted (+75 XP)" : "Submit Reflection (+75 XP)"}
      </Button>
    </div>
  );
}

function ExerciseBlock({
  title, steps, xp, blockKey, onAward,
}: { title: string; steps: string[]; xp: number; blockKey: string; onAward?: (k: string) => Promise<void> }) {
  const [checked, setChecked] = useState<boolean[]>(() => steps.map(() => false));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const allChecked = checked.length > 0 && checked.every(Boolean);
  const submit = async () => {
    if (!onAward) return;
    setBusy(true);
    try { await onAward(blockKey); setDone(true); } finally { setBusy(false); }
  };
  return (
    <div className="my-8 rounded-2xl p-5 md:p-6 border-2 border-dashed" style={{ borderColor: `${READER.gold}88`, background: READER.paper }}>
      <div className="flex items-center gap-2 mb-3" style={{ color: READER.ink }}>
        <ListChecks className="w-4 h-4" style={{ color: READER.gold }} />
        <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: READER.gold }}>Exercise</span>
      </div>
      <div className="text-[19px] font-semibold mb-4" style={{ fontFamily: READER.serif, color: READER.ink }}>
        {title || "Exercise"}
      </div>
      <ol className="space-y-2 mb-5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}
              disabled={done}
              className="mt-0.5 w-5 h-5 rounded border grid place-items-center transition-colors"
              style={{
                borderColor: checked[i] ? READER.gold : `${READER.ink}33`,
                background: checked[i] ? READER.gold : "transparent",
              }}
              aria-label={`Step ${i + 1}`}
            >
              {checked[i] && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
            <span className="text-[16px] leading-relaxed" style={{ color: READER.ink, textDecoration: checked[i] ? "line-through" : undefined, opacity: checked[i] ? 0.6 : 1 }}>
              <Inline text={s} />
            </span>
          </li>
        ))}
      </ol>
      <Button
        onClick={submit}
        disabled={busy || done || !allChecked}
        style={{ background: READER.gold, color: READER.navy }}
      >
        {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
        {done ? `Completed (+${xp} XP)` : `Mark Complete (+${xp} XP)`}
        {!done && <Sparkles className="w-3 h-3 ml-1" />}
      </Button>
    </div>
  );
}

function VideoBlock({ url, caption }: { url: string; caption?: string }) {
  const isYouTube = /(?:youtube\.com|youtu\.be)/.test(url);
  const embed = isYouTube
    ? url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")
    : url;
  return (
    <figure className="my-8">
      <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: "16/9", background: "#000" }}>
        {isYouTube ? (
          <iframe
            src={embed}
            title={caption ?? "Session video"}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={url} controls className="absolute inset-0 w-full h-full">
            <track kind="captions" />
          </video>
        )}
        {!url && (
          <div className="absolute inset-0 grid place-items-center text-white/70">
            <PlayCircle className="w-10 h-10" />
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="text-center italic mt-2 text-sm" style={{ color: READER.inkSoft }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function ImageBlock({ url, alt, caption }: { url: string; alt?: string; caption?: string }) {
  return (
    <figure className="my-8">
      <img
        src={url}
        alt={alt ?? caption ?? ""}
        className="w-full rounded-2xl"
        style={{ boxShadow: "0 20px 40px -20px rgba(13,43,85,0.35)" }}
        loading="lazy"
      />
      {caption && (
        <figcaption className="text-center italic mt-2 text-sm" style={{ color: READER.inkSoft }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function DividerBlock() {
  return (
    <div className="my-10 flex items-center justify-center gap-3" aria-hidden>
      <span className="h-px w-24" style={{ background: `${READER.gold}88` }} />
      <span className="block w-2 h-2 rotate-45" style={{ background: READER.gold }} />
      <span className="h-px w-24" style={{ background: `${READER.gold}88` }} />
    </div>
  );
}

function KeyTermsBlock({ terms }: { terms: Array<{ term: string; definition: string }> }) {
  return (
    <dl className="my-8 rounded-xl border p-5 md:p-6" style={{ borderColor: `${READER.gold}44`, background: READER.paper }}>
      <div className="text-[11px] uppercase tracking-widest font-semibold mb-4" style={{ color: READER.gold }}>Key terms</div>
      <div className="space-y-4">
        {terms.map((t, i) => (
          <div key={i} className="grid md:grid-cols-[minmax(120px,180px)_1fr] gap-2 md:gap-6">
            <dt className="font-semibold" style={{ color: READER.gold, fontFamily: READER.serif }}>{t.term}</dt>
            <dd style={{ color: READER.ink, lineHeight: 1.6 }}><Inline text={t.definition} /></dd>
          </div>
        ))}
      </div>
    </dl>
  );
}

function StatGridBlock({ stats }: { stats: Array<{ value: string; label: string; source?: string }> }) {
  return (
    <div className="my-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((s, i) => (
        <div key={i} className="rounded-2xl p-5 md:p-6 border" style={{ background: READER.paper, borderColor: `${READER.gold}33` }}>
          <div style={{ fontFamily: READER.serif, color: READER.navy, fontSize: 48, lineHeight: 1, fontWeight: 600 }}>
            {s.value}
          </div>
          <div className="mt-2 text-[15px]" style={{ color: READER.ink }}>{s.label}</div>
          {s.source && (
            <div className="mt-2 text-[11px] uppercase tracking-widest" style={{ color: READER.inkSoft }}>
              Source: {s.source}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}