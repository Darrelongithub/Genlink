// Shared type definitions for session content blocks.
// The `type` union mirrors the database `session_block_type` enum.

export type BlockType =
  | "heading"
  | "paragraph"
  | "callout"
  | "quote"
  | "table"
  | "warning"
  | "reflection"
  | "exercise"
  | "video"
  | "image"
  | "divider"
  | "key_terms"
  | "stat_grid"
  | "code";

export type CalloutVariant = "ai_prompt" | "key_idea" | "kenya_context";

export type BlockContent =
  | { level: 1 | 2 | 3; text: string }                                                   // heading
  | { text: string }                                                                     // paragraph
  | { variant: CalloutVariant; title?: string; body: string }                            // callout
  | { text: string; attribution?: string }                                               // quote
  | { headers: string[]; rows: string[][] }                                              // table
  | { title?: string; body: string }                                                     // warning
  | { number?: number; prompt: string }                                                  // reflection
  | { title: string; steps: string[]; xp?: number }                                      // exercise
  | { url: string; caption?: string }                                                    // video
  | { url: string; alt?: string; caption?: string }                                      // image
  | Record<string, never>                                                                // divider
  | { terms: Array<{ term: string; definition: string }> }                               // key_terms
  | { stats: Array<{ value: string; label: string; source?: string }> }                  // stat_grid
  | { code: string; language?: string };                                                  // code

export interface SessionBlock {
  id?: string;
  session_id?: string;
  order_index: number;
  block_type: BlockType;
  content: BlockContent;
}

// Rough reading time in whole minutes, given a full list of blocks.
// Assumes ~220 wpm and treats non-text blocks as short pauses.
export function estimateReadMinutes(blocks: SessionBlock[]): number {
  const WPM = 220;
  let words = 0;
  let bonus = 0;
  for (const b of blocks) {
    const c = b.content as Record<string, unknown>;
    const text =
      (typeof c.text === "string" && c.text) ||
      (typeof c.body === "string" && c.body) ||
      (typeof c.prompt === "string" && c.prompt) ||
      "";
    if (text) words += text.split(/\s+/).filter(Boolean).length;
    if (b.block_type === "exercise") bonus += 90;      // seconds
    if (b.block_type === "reflection") bonus += 60;
    if (b.block_type === "video") bonus += 120;
    if (b.block_type === "table") bonus += 20;
  }
  const minutes = words / WPM + bonus / 60;
  return Math.max(1, Math.round(minutes));
}