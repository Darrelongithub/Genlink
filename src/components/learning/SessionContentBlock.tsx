import { useState } from "react";
import { Sparkles, AlertTriangle, Quote, ListChecks, Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string; level?: 2 | 3 }
  | { type: "callout"; title?: string; text: string; icon?: string }
  | { type: "reflection"; prompt: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "warning"; text: string }
  | { type: "exercise"; title?: string; steps: string[] };

interface Props {
  block: Block;
  onAwardReflection: () => Promise<void>;
  onAwardExercise: () => Promise<void>;
}

export default function SessionContentBlock({ block, onAwardReflection, onAwardExercise }: Props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [reflection, setReflection] = useState("");

  switch (block.type) {
    case "heading": {
      const Tag = (block.level === 3 ? "h3" : "h2") as keyof JSX.IntrinsicElements;
      return <Tag className={cn("font-bold mt-8 mb-3", block.level === 3 ? "text-xl" : "text-2xl")}>{block.text}</Tag>;
    }
    case "paragraph":
      return <p className="text-foreground/90 leading-relaxed mb-4">{block.text}</p>;

    case "callout":
      return (
        <div className="bg-card rounded-lg border-l-4 border-amber-500 shadow-sm p-5 my-6 flex gap-4">
          <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            {block.title && <p className="font-semibold mb-1">{block.title}</p>}
            <p className="text-sm text-foreground/80 leading-relaxed">{block.text}</p>
          </div>
        </div>
      );

    case "reflection":
      return (
        <div className="bg-[#EEF4FF] rounded-lg p-5 my-6">
          <p className="font-semibold mb-3 text-blue-900">Reflection</p>
          <p className="text-sm mb-3 text-blue-900/80">{block.prompt}</p>
          <Textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Your reflection…"
            className="bg-white mb-3 min-h-[100px]"
            disabled={done}
          />
          <Button
            size="sm"
            disabled={busy || done || reflection.trim().length < 5}
            onClick={async () => {
              setBusy(true);
              try { await onAwardReflection(); setDone(true); } finally { setBusy(false); }
            }}
          >
            {busy && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {done ? "Submitted (+75 XP)" : "Submit Reflection"}
          </Button>
        </div>
      );

    case "quote":
      return (
        <blockquote className="my-8 px-6 relative">
          <Quote className="absolute -top-2 -left-2 w-10 h-10 text-amber-500/60" />
          <p className="italic text-xl text-foreground/90 leading-relaxed pl-6">{block.text}</p>
          {block.attribution && (
            <footer className="mt-3 pl-6 text-xs uppercase tracking-widest text-muted-foreground">— {block.attribution}</footer>
          )}
        </blockquote>
      );

    case "table":
      return (
        <div className="my-6 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--primary))] text-primary-foreground">
                {block.headers.map((h, i) => <th key={i} className="text-left p-3 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 ? "bg-white" : "bg-[#F9F6F0]"}>
                  {row.map((c, ci) => <td key={ci} className="p-3">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "warning":
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-6 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">{block.text}</p>
        </div>
      );

    case "exercise":
      return (
        <div className="rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-5 my-6">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-5 h-5 text-emerald-700" />
            <p className="font-semibold text-emerald-900">{block.title || "Exercise"}</p>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-foreground/90 mb-4">
            {block.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          <Button
            size="sm"
            variant={done ? "outline" : "default"}
            disabled={busy || done}
            onClick={async () => {
              setBusy(true);
              try { await onAwardExercise(); setDone(true); } finally { setBusy(false); }
            }}
          >
            {busy && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {done ? "Completed (+150 XP)" : "Mark Complete"}
            {!done && <Sparkles className="w-3 h-3 ml-1" />}
          </Button>
        </div>
      );
  }
}