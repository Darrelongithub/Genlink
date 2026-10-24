import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import mammoth from "mammoth";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { parseTextToBlocks } from "@/lib/blocks/parser";
import type { SessionBlock } from "@/lib/blocks/types";
import BlockRenderer from "@/components/reader/BlockRenderer";
import { READER } from "@/components/reader/readerTheme";
import StickyNav from "@/components/StickyNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, FileText, CheckCircle2, ShieldCheck } from "lucide-react";

const db = supabase as any;

interface PillarOption { id: string; name: string }
interface UnitOption { id: string; title: string; pillar_id: string; status: string }
interface SessionOption { id: string; title: string; order_index: number; unit_id: string }

export default function AdminImport() {
  const { isAdmin, loading } = useUserRole();

  const [pillarId, setPillarId] = useState<string>("");
  const [unitId, setUnitId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [raw, setRaw] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [lastPublished, setLastPublished] = useState<string | null>(null);

  const pillars = useQuery({
    queryKey: ["admin_pillars"],
    queryFn: async (): Promise<PillarOption[]> => {
      const { data } = await db.from("units").select("pillar_id").order("pillar_id");
      const set = Array.from(new Set(((data ?? []) as any[]).map((r) => r.pillar_id))) as string[];
      return set.map((id) => ({ id, name: id }));
    },
  });
  const units = useQuery({
    queryKey: ["admin_units", pillarId],
    enabled: !!pillarId,
    queryFn: async (): Promise<UnitOption[]> => {
      const { data, error } = await db
        .from("units").select("id,title,pillar_id,status")
        .eq("pillar_id", pillarId).order("order_index");
      if (error) throw error;
      return (data ?? []) as UnitOption[];
    },
  });
  const sessions = useQuery({
    queryKey: ["admin_sessions", unitId],
    enabled: !!unitId,
    queryFn: async (): Promise<SessionOption[]> => {
      const { data, error } = await db
        .from("unit_sessions").select("id,title,order_index,unit_id")
        .eq("unit_id", unitId).order("order_index");
      if (error) throw error;
      return (data ?? []) as SessionOption[];
    },
  });

  const parsed: SessionBlock[] = useMemo(() => (raw.trim() ? parseTextToBlocks(raw) : []), [raw]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">
        Checking access…
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      if (/\.docx$/i.test(f.name)) {
        const buf = await f.arrayBuffer();
        // mammoth types don't advertise convertToMarkdown but it exists at runtime.
        const convert = (mammoth as any).convertToMarkdown ?? (mammoth as any).convertToHtml;
        const { value } = await convert({ arrayBuffer: buf });
        // If convertToMarkdown wasn't available we fall back to HTML — strip tags for a rough textual pass.
        setRaw(String(value).replace(/<[^>]+>/g, ""));
      } else {
        setRaw(await f.text());
      }
      toast.success(`Loaded ${f.name}`);
    } catch (err) {
      toast.error(`Could not read ${f.name}`);
    } finally {
      e.target.value = "";
    }
  };

  const publish = async () => {
    if (!sessionId) return toast.error("Pick a session first");
    if (parsed.length === 0) return toast.error("Nothing parsed yet — paste or upload content");
    setPublishing(true);
    try {
      const firstH2 = parsed.find((block) => {
        if (block.block_type !== "heading") return false;
        const content = block.content as { level?: number; text?: string };
        return content.level === 2 && Boolean(content.text?.trim());
      });
      const sessionTitle = firstH2
        ? (firstH2.content as { text: string }).text.trim()
        : null;
      // Replace all blocks for this session atomically enough for our purposes:
      // delete-then-insert. RLS restricts both to admins so no race with users.
      const del = await db.from("session_blocks").delete().eq("session_id", sessionId);
      if (del.error) throw del.error;
      const rows = parsed.map((b) => ({
        session_id: sessionId,
        order_index: b.order_index,
        block_type: b.block_type,
        content: b.content,
      }));
      const ins = await db.from("session_blocks").insert(rows);
      if (ins.error) throw ins.error;
      if (sessionTitle) {
        const titleUpdate = await db.from("unit_sessions").update({ title: sessionTitle }).eq("id", sessionId);
        if (titleUpdate.error) throw titleUpdate.error;
        await sessions.refetch();
      }
      setLastPublished(new Date().toLocaleTimeString());
      toast.success(`Published ${rows.length} blocks`);
    } catch (err: any) {
      toast.error(err?.message ?? "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: READER.cream }}>
      <StickyNav />
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-2 mb-2" style={{ color: READER.gold }}>
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-widest font-semibold">Admin · Content importer</span>
        </div>
        <h1 className="text-3xl md:text-4xl mb-2" style={{ fontFamily: READER.serif, color: READER.ink }}>
          Import a session
        </h1>
        <p className="mb-8 text-sm" style={{ color: READER.inkSoft }}>
          Pick a session, paste or upload structured text (Markdown or .docx), review the parsed blocks,
          then publish. Existing blocks for the session are replaced on publish.
        </p>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* left: inputs */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Select label="Pillar" value={pillarId} onChange={(v) => { setPillarId(v); setUnitId(""); setSessionId(""); }} options={(pillars.data ?? []).map((p) => ({ value: p.id, label: p.name }))} />
              <Select label="Unit" value={unitId} onChange={(v) => { setUnitId(v); setSessionId(""); }} options={(units.data ?? []).map((u) => ({ value: u.id, label: u.status === "hidden" ? `${u.title} (hidden)` : u.title }))} disabled={!pillarId} />
              <Select label="Session" value={sessionId} onChange={setSessionId} options={(sessions.data ?? []).map((s) => ({ value: s.id, label: `${s.order_index + 1}. ${s.title}` }))} disabled={!unitId} />
            </div>

            {unitId && (
              <UnitStatusControl
                unit={units.data?.find((u) => u.id === unitId)}
                onChanged={() => units.refetch()}
              />
            )}

            <div className="rounded-xl border p-4" style={{ background: "white", borderColor: `${READER.ink}14` }}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold" style={{ color: READER.ink }}>Paste session text</label>
                <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer px-2 py-1 rounded border hover:bg-black/5" style={{ borderColor: `${READER.ink}22`, color: READER.inkSoft }}>
                  <Upload className="w-3.5 h-3.5" />
                  Upload .docx / .md
                  <input type="file" accept=".docx,.md,.markdown,.txt" className="hidden" onChange={onFile} />
                </label>
              </div>
              <Textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={`# Session title\n\nOpening paragraph…\n\nAI Prompt: Give me three examples of…\n\nReflection Question 1: What is your current…\n\nExercise: Build your first tracker\n1. Open a spreadsheet\n2. List every income source\n3. Total it monthly\n\n| Column | Meaning |\n|--------|---------|\n| A | Income |\n| B | Expense |\n\n> A budget tells your money where to go — John Maxwell`}
                className="min-h-[520px] font-mono text-sm bg-white"
              />
              <div className="mt-2 flex items-center justify-between text-xs" style={{ color: READER.inkSoft }}>
                <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" /> {parsed.length} blocks parsed</span>
                {lastPublished && <span className="inline-flex items-center gap-1" style={{ color: READER.green }}><CheckCircle2 className="w-3 h-3" /> Last published {lastPublished}</span>}
              </div>
            </div>

            <Button
              onClick={publish}
              disabled={publishing || !sessionId || parsed.length === 0}
              className="w-full font-semibold"
              style={{ background: READER.navy, color: "white" }}
            >
              {publishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Publish to Session
            </Button>
          </div>

          {/* right: preview */}
          <div className="rounded-xl border p-5 md:p-7" style={{ background: READER.paper, borderColor: `${READER.ink}14` }}>
            <div className="text-[11px] uppercase tracking-widest mb-4" style={{ color: READER.gold }}>Live preview</div>
            {parsed.length === 0 ? (
              <p className="text-sm italic" style={{ color: READER.inkSoft }}>
                Paste content on the left to see it rendered as the student will see it.
              </p>
            ) : (
              <article>
                {parsed.map((b, i) => (
                  <BlockRenderer key={i} index={i} block={b} onAwardReflection={async () => {}} onAwardExercise={async () => {}} />
                ))}
              </article>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UnitStatusControl({ unit, onChanged }: { unit?: UnitOption; onChanged: () => void }) {
  const [saving, setSaving] = useState(false);
  if (!unit) return null;
  const change = async (status: string) => {
    if (status === unit.status) return;
    setSaving(true);
    const { error } = await db.from("units").update({ status }).eq("id", unit.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Unit marked ${status.replace("_", " ")}`);
    onChanged();
  };
  return (
    <div className="rounded-xl border p-3 flex items-center gap-3" style={{ background: "white", borderColor: `${READER.ink}14` }}>
      <label className="text-xs uppercase tracking-widest" style={{ color: READER.inkSoft }}>Unit status</label>
      <select
        value={unit.status}
        disabled={saving}
        onChange={(e) => change(e.target.value)}
        className="rounded-md border px-2 py-1.5 text-sm bg-white disabled:opacity-50"
        style={{ borderColor: `${READER.ink}22`, color: READER.ink }}
      >
        <option value="live">Live</option>
        <option value="coming_soon">Coming soon</option>
        <option value="hidden">Hidden</option>
      </select>
      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: READER.inkSoft }} />}
    </div>
  );
}

function Select({
  label, value, onChange, options, disabled,
}: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; disabled?: boolean }) {
  return (
    <label className="text-xs" style={{ color: READER.inkSoft }}>
      <span className="block mb-1 uppercase tracking-widest">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-md border px-2 py-2 text-sm bg-white disabled:opacity-50"
        style={{ borderColor: `${READER.ink}22`, color: READER.ink }}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}