import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useUnit, useUnitSessions } from "@/hooks/useUnits";
import { useSessionBlocks } from "@/hooks/useSessionBlocks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useXPReward } from "@/contexts/XPRewardContext";
import BlockRenderer from "@/components/reader/BlockRenderer";
import { estimateReadMinutes, type SessionBlock } from "@/lib/blocks/types";
import { READER } from "@/components/reader/readerTheme";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, CheckCircle2, Clock } from "lucide-react";
import StickyNav from "@/components/StickyNav";
import AdaptCheckInPrompt from "@/components/adapt/AdaptCheckInPrompt";
import { toast } from "sonner";
import { useLightGuideContext } from "@/components/tutor/LightGuideProvider";
import { pillars } from "@/data/courses";
import { usePillarEnrollment } from "@/hooks/usePillarEnrollment";

// If a session has no imported blocks and no legacy JSONB content, show a
// gentle placeholder rather than a blank page.
const PLACEHOLDER_BLOCKS: SessionBlock[] = [
  { order_index: 0, block_type: "heading", content: { level: 1, text: "Session content coming soon" } },
  { order_index: 1, block_type: "paragraph", content: { text: "This session hasn't been imported yet. Use the controls below to mark progress while we finalise the material." } },
];

// Convert the legacy unit_sessions.content shape (used before the block
// importer existed) into the new SessionBlock format so nothing breaks for
// sessions that were populated by hand.
function legacyToBlocks(raw: any[]): SessionBlock[] {
  return raw.map((b, i) => {
    switch (b.type) {
      case "heading":    return { order_index: i, block_type: "heading",    content: { level: b.level ?? 1, text: b.text ?? "" } };
      case "paragraph":  return { order_index: i, block_type: "paragraph",  content: { text: b.text ?? "" } };
      case "callout":    return { order_index: i, block_type: "callout",    content: { variant: "key_idea", title: b.title, body: b.text ?? "" } };
      case "quote":      return { order_index: i, block_type: "quote",      content: { text: b.text ?? "", attribution: b.attribution } };
      case "table":      return { order_index: i, block_type: "table",      content: { headers: b.headers ?? [], rows: b.rows ?? [] } };
      case "warning":    return { order_index: i, block_type: "warning",    content: { title: "Warning", body: b.text ?? "" } };
      case "reflection": return { order_index: i, block_type: "reflection", content: { prompt: b.prompt ?? "" } };
      case "exercise":   return { order_index: i, block_type: "exercise",   content: { title: b.title ?? "Exercise", steps: b.steps ?? [], xp: 150 } };
      default:           return { order_index: i, block_type: "paragraph",  content: { text: b.text ?? "" } };
    }
  });
}

export default function SessionReader() {
  const { pillarId, unitId, sessionIndex } = useParams<{ pillarId: string; unitId: string; sessionIndex?: string }>();
  const idx = Math.max(0, parseInt(sessionIndex || "1", 10) - 1);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { award } = useXPReward();
  const qc = useQueryClient();
  const setTutorContext = useLightGuideContext();

  const { data: unit } = useUnit(unitId);
  const { data: sessions, isLoading: sessionsLoading } = useUnitSessions(unitId);
  const { data: isEnrolled = false } = usePillarEnrollment(pillarId);
  // Not enrolled → this is a public preview (Unit 1 Session 1). No XP is awarded for previews.
  const isPreview = !user || !isEnrolled;
  const session = sessions?.[idx];
  const pillarName = pillars.find((pillar) => pillar.id === pillarId)?.name;
  useEffect(() => {
    setTutorContext({
      unit_id: unitId,
      session_id: session?.id,
      pillar_name: pillarName,
      unit_title: unit?.title ?? `Unit ${unit ? unit.order_index + 1 : 1}`,
      session_title: session?.title ?? `Session ${idx + 1}`,
    });
    return () => setTutorContext(null);
  }, [setTutorContext, unitId, session?.id, session?.title, pillarName, unit?.title, unit?.order_index, idx]);
  const { data: importedBlocks } = useSessionBlocks(session?.id);

  const [scrollPct, setScrollPct] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setScrollPct(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [idx]);

  useEffect(() => { window.scrollTo(0, 0); }, [idx]);

  const totalSessions = unit?.session_count ?? sessions?.length ?? 5;
  const isLast = idx + 1 >= totalSessions;

  const blocks: SessionBlock[] = useMemo(() => {
    if (importedBlocks && importedBlocks.length > 0) return importedBlocks;
    const legacy = (session?.content as any[]) ?? [];
    if (legacy.length > 0) return legacyToBlocks(legacy);
    return PLACEHOLDER_BLOCKS;
  }, [importedBlocks, session]);

  const readMinutes = useMemo(() => estimateReadMinutes(blocks), [blocks]);
  const firstBlock = blocks[0];
  const firstText = firstBlock?.content && "text" in firstBlock.content ? firstBlock.content.text : undefined;
  const bodyBlocks = firstBlock?.block_type === "heading" && typeof firstText === "string"
    && firstText.trim() === session?.title.trim() ? blocks.slice(1) : blocks;

  async function callAwardXP(action_type: string, extra: Record<string, any> = {}) {
    if (isPreview) return;
    if (!user || !unitId) { toast.error("Sign in to track progress"); return; }
    const session_id = `${unitId}:${idx}:${action_type}:${extra.bucket ?? "default"}`;
    const { data, error } = await supabase.functions.invoke("award-xp", {
      body: { action_type, session_id, unit_id: unitId, ...extra },
    });
    if (error) { toast.error("Could not award XP"); return; }
    const xp = (data as any)?.xp_awarded ?? 0;
    if (xp > 0) award({ amount: xp });
    qc.invalidateQueries({ queryKey: ["user_unit_progress"] });
    qc.invalidateQueries({ queryKey: ["user_xp"] });
  }

  async function completeSession() {
    setBusy(true);
    try {
      await callAwardXP("session");
      if (isLast) {
        await callAwardXP("unit_complete");
        toast.success("Unit complete! +500 XP bonus");
        navigate(`/pillar/${pillarId}`);
      } else {
        navigate(`/pillar/${pillarId}/unit/${unitId}/session/${idx + 2}`);
      }
    } finally { setBusy(false); }
  }

  if (!sessionsLoading && !session) {
    return (
      <div className="min-h-screen bg-cinematic-surface relative">
        <StickyNav />
        <div className="container mx-auto max-w-[720px] px-5 py-20 text-center">
          <h1 className="text-3xl mb-3" style={{ fontFamily: READER.serif, color: READER.ink }}>This session is locked</h1>
          <p className="text-sm mb-6" style={{ color: READER.inkSoft }}>
            Only the first session of each pillar is open as a preview. Unlock the pillar to keep reading.
          </p>
          <Button asChild style={{ background: READER.gold, color: READER.navy }}>
            <Link to={`/pillar/${pillarId}`}>See what unlocks it</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinematic-surface relative">
      <StickyNav />

      {/* reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px]" style={{ background: `${READER.gold}22` }}>
        <div className="h-full transition-[width] duration-100 ease-out" style={{ width: `${scrollPct}%`, background: READER.gold }} />
      </div>

      <div className="session-reader-content container mx-auto max-w-[720px] px-5 md:px-6 py-12 md:py-16">
        <Link to={`/pillar/${pillarId}`} className="inline-flex items-center text-sm mb-8 hover:opacity-80" style={{ color: READER.inkSoft }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to pillar
        </Link>

        <div className="text-[11px] uppercase tracking-[0.24em] mb-3" style={{ color: READER.gold }}>
          {unit?.title ?? "Unit"} · Session {idx + 1} of {totalSessions}
        </div>
        <h1
          className="text-4xl md:text-5xl leading-tight mb-4"
          style={{ fontFamily: READER.serif, color: READER.ink }}
        >
          {session?.title ?? `Session ${idx + 1}`}
        </h1>
        <div className="inline-flex items-center gap-1.5 text-xs mb-10" style={{ color: READER.inkSoft }}>
          <Clock className="w-3.5 h-3.5" />
          <span>~{readMinutes} min read</span>
        </div>

        {isPreview && (
          <div className="mb-8 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: `${READER.gold}55`, background: `${READER.gold}12`, color: READER.ink }}>
            You're reading a free preview. Progress and XP aren't recorded for previews.
          </div>
        )}
        {!isPreview && session?.id ? <AdaptCheckInPrompt sessionKey={session.id} /> : null}

        <article>
          {bodyBlocks.map((b, i) => (
            <BlockRenderer
              key={b.id ?? i}
              index={i}
              block={b}
              onAwardReflection={(k) => callAwardXP("reflection", { bucket: k })}
              onAwardExercise={(k) => callAwardXP("exercise", { bucket: k })}
            />
          ))}
        </article>

        {isPreview ? (
          <div className="mt-14 border-t pt-6 flex flex-col sm:flex-row gap-3 items-center justify-between" style={{ borderColor: `${READER.ink}14` }}>
            <span className="text-sm" style={{ color: READER.inkSoft }}>End of preview.</span>
            <Button asChild className="font-semibold" style={{ background: READER.gold, color: READER.navy }}>
              <Link to={user ? `/pillar/${pillarId}` : "/pathway-intelligence"}>
                {user ? "See how to unlock this pillar" : "Start your assessment"} <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        ) : (
        <div className="mt-14 border-t pt-6 flex items-center justify-between" style={{ borderColor: `${READER.ink}14` }}>
          <Button
            variant="outline"
            disabled={idx === 0}
            onClick={() => navigate(`/pillar/${pillarId}/unit/${unitId}/session/${idx}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <Button
            onClick={completeSession}
            disabled={busy}
            className="font-semibold"
            style={{ background: READER.gold, color: READER.navy }}
          >
            {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {isLast ? (
              <>Complete Unit (+500 XP) <CheckCircle2 className="w-4 h-4 ml-1" /></>
            ) : (
              <>Complete Session (+50 XP) <ArrowRight className="w-4 h-4 ml-1" /></>
            )}
            <Sparkles className="w-3 h-3 ml-1" />
          </Button>
        </div>
        )}
      </div>

    </div>
  );
}