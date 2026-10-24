// Text/markdown -> SessionBlock[] parser.
// Deliberately forgiving: unknown lines fall back to paragraphs so nothing
// is silently dropped during an import.

import type { CalloutVariant, SessionBlock } from "./types";

type Draft = Omit<SessionBlock, "order_index"> & { order_index?: number };

const CALLOUT_LABELS: Record<string, CalloutVariant> = {
  "ai prompt": "ai_prompt",
  prompt: "ai_prompt",
  "kenya context": "kenya_context",
  kenya: "kenya_context",
  "key idea": "key_idea",
  insight: "key_idea",
};

function push(list: Draft[], b: Draft) {
  list.push(b);
}

function flushParagraph(buf: string[], out: Draft[]) {
  const text = buf.join(" ").replace(/\s+/g, " ").trim();
  buf.length = 0;
  if (text) push(out, { block_type: "paragraph", content: { text } });
}

// Detect a markdown-style table starting at index i. Returns the parsed table
// draft plus the number of lines consumed, or null if it doesn't match.
function tryTable(lines: string[], i: number): { block: Draft; consumed: number } | null {
  const header = lines[i];
  const sep = lines[i + 1];
  if (!header || !sep) return null;
  if (!/^\s*\|.+\|\s*$/.test(header)) return null;
  if (!/^\s*\|?\s*:?-{2,}:?(\s*\|\s*:?-{2,}:?)+\s*\|?\s*$/.test(sep)) return null;
  const parseRow = (l: string) =>
    l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const headers = parseRow(header);
  const rows: string[][] = [];
  let j = i + 2;
  while (j < lines.length && /^\s*\|.+\|\s*$/.test(lines[j])) {
    rows.push(parseRow(lines[j]));
    j++;
  }
  return {
    block: { block_type: "table", content: { headers, rows } },
    consumed: j - i,
  };
}

function tryCode(lines: string[], i: number): { block: Draft; consumed: number } | null {
  const opening = lines[i].match(/^\s*```\s*([^\s`]*)\s*$/);
  if (!opening) return null;
  const body: string[] = [];
  let j = i + 1;
  while (j < lines.length && !/^\s*```\s*$/.test(lines[j])) {
    body.push(lines[j]);
    j++;
  }
  if (j < lines.length) j++;
  return {
    block: {
      block_type: "code",
      content: { code: body.join("\n"), language: opening[1] || undefined },
    },
    consumed: j - i,
  };
}

// Detect "Exercise:" followed by numbered/bulleted steps.
function tryExercise(lines: string[], i: number): { block: Draft; consumed: number } | null {
  const m = lines[i].match(/^\s*Exercise\s*:\s*(.*)$/i);
  if (!m) return null;
  const title = m[1].trim() || "Exercise";
  const steps: string[] = [];
  let j = i + 1;
  while (j < lines.length) {
    const s = lines[j].match(/^\s*(?:\d+[.)]|-|\*|•)\s+(.+)$/);
    if (!s) break;
    steps.push(s[1].trim());
    j++;
  }
  if (steps.length === 0) return null;
  return {
    block: { block_type: "exercise", content: { title, steps, xp: 150 } },
    consumed: j - i,
  };
}

// Detect a callout block: "AI Prompt:", "Key Idea:", "Kenya Context:" — the
// body is everything until a blank line or the next recognised block.
function tryCallout(lines: string[], i: number): { block: Draft; consumed: number } | null {
  const m = lines[i].match(/^\s*(AI Prompt|Prompt|Kenya Context|Kenya|Key Idea|Insight)\s*:\s*(.*)$/i);
  if (!m) return null;
  const variant = CALLOUT_LABELS[m[1].toLowerCase()] ?? "key_idea";
  const body: string[] = [];
  if (m[2].trim()) body.push(m[2].trim());
  let j = i + 1;
  while (j < lines.length && lines[j].trim() && !/^(##|>|\|)/.test(lines[j]) && !/^\s*(AI Prompt|Prompt|Kenya|Key Idea|Insight|Exercise|Reflection Question|Warning)/i.test(lines[j])) {
    body.push(lines[j].trim());
    j++;
  }
  return {
    block: {
      block_type: "callout",
      content: { variant, title: m[1], body: body.join(" ").trim() },
    },
    consumed: j - i,
  };
}

function tryReflection(line: string): Draft | null {
  const m = line.match(/^\s*Reflection(?:\s+Question)?\s*(\d+)?\s*:\s*(.+)$/i);
  if (!m) return null;
  return {
    block_type: "reflection",
    content: { number: m[1] ? parseInt(m[1], 10) : undefined, prompt: m[2].trim() },
  };
}

function tryWarning(line: string): Draft | null {
  const m = line.match(/^\s*(?:!|Warning)\s*:\s*(.+)$/i);
  if (!m) return null;
  return { block_type: "warning", content: { title: "Warning", body: m[1].trim() } };
}

function tryHeading(line: string): Draft | null {
  const m = line.match(/^(#{1,3})\s+(.+)$/);
  if (!m) return null;
  return {
    block_type: "heading",
    content: { level: m[1].length as 1 | 2 | 3, text: m[2].trim() },
  };
}

function tryQuote(line: string): Draft | null {
  const m = line.match(/^\s*>\s+(.+)$/);
  if (!m) return null;
  const rest = m[1];
  const attr = rest.match(/^(.*?)\s+—\s+(.+)$/);
  if (attr) return { block_type: "quote", content: { text: attr[1].trim(), attribution: attr[2].trim() } };
  return { block_type: "quote", content: { text: rest.trim() } };
}

function tryDivider(line: string): Draft | null {
  if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
    return { block_type: "divider", content: {} };
  }
  return null;
}

function tryMedia(line: string): Draft | null {
  const img = line.match(/^\s*!\[(.*?)\]\((.+?)\)\s*$/);
  if (img) return { block_type: "image", content: { url: img[2], alt: img[1] } };
  const vid = line.match(/^\s*@video\((.+?)\)\s*(.*)$/);
  if (vid) return { block_type: "video", content: { url: vid[1], caption: vid[2].trim() || undefined } };
  return null;
}

/**
 * Parse raw markdown/plain text into an ordered list of SessionBlocks.
 */
export function parseTextToBlocks(input: string): SessionBlock[] {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const out: Draft[] = [];
  const paraBuf: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const stripped = line.trim();

    if (!stripped) {
      flushParagraph(paraBuf, out);
      continue;
    }

    const code = tryCode(lines, i);
    if (code) { flushParagraph(paraBuf, out); out.push(code.block); i += code.consumed - 1; continue; }

    const tbl = tryTable(lines, i);
    if (tbl) { flushParagraph(paraBuf, out); out.push(tbl.block); i += tbl.consumed - 1; continue; }

    const ex = tryExercise(lines, i);
    if (ex) { flushParagraph(paraBuf, out); out.push(ex.block); i += ex.consumed - 1; continue; }

    const co = tryCallout(lines, i);
    if (co) { flushParagraph(paraBuf, out); out.push(co.block); i += co.consumed - 1; continue; }

    const single =
      tryHeading(stripped) ??
      tryReflection(stripped) ??
      tryWarning(stripped) ??
      tryQuote(stripped) ??
      tryDivider(stripped) ??
      tryMedia(stripped);

    if (single) {
      flushParagraph(paraBuf, out);
      out.push(single);
      continue;
    }

    paraBuf.push(stripped);
  }
  flushParagraph(paraBuf, out);

  return out.map((b, idx) => ({ ...b, order_index: idx } as SessionBlock));
}