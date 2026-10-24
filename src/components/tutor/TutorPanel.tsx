import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Send, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { makeId, safeSessionGet, safeSessionSet } from "@/lib/safeStorage";
import LightGuide from "./LightGuide";
import "./lightGuide.css";
import type { TutorContext } from "./LightGuideProvider";
import { startersFor, type RouteInfo } from "./routeContext";

interface Props {
  open: boolean;
  onClose: () => void;
  route: RouteInfo;
  pageContext: TutorContext | null;
}

interface GuideAction { id: string; label: string; href: string }
interface Msg { role: "user" | "assistant"; content: string; actions?: GuideAction[] }

const ANON_ID_KEY = "lg-anon-id";
function anonId() {
  // safeSession*/makeId: on a plain-http LAN address Safari has no
  // crypto.randomUUID (secure contexts only) and may refuse storage --
  // both used to throw here and take the tutor down on Apple devices.
  let id = safeSessionGet(ANON_ID_KEY);
  if (!id) { id = makeId(); safeSessionSet(ANON_ID_KEY, id); }
  return id;
}

export default function TutorPanel({ open, onClose, route, pageContext }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const storeKey = `lg-convo:${user?.id ?? "anon"}`;
  const usageKey = `lg-usage:${user?.id ?? "anon"}`;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // One conversation per browser tab, persisted across navigation.
  useEffect(() => {
    try {
      setMessages(JSON.parse(safeSessionGet(storeKey) || "[]"));
      setUsage(JSON.parse(safeSessionGet(usageKey) || "null"));
    } catch { setMessages([]); setUsage(null); }
  }, [storeKey, usageKey]);
  useEffect(() => { safeSessionSet(storeKey, JSON.stringify(messages.slice(-40))); }, [messages, storeKey]);
  useEffect(() => { if (usage) safeSessionSet(usageKey, JSON.stringify(usage)); }, [usage, usageKey]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy, open]);

  // Focus into the panel on open; Esc closes.
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const limit = usage?.limit ?? (user ? 10 : 5);
  const used = usage?.used ?? 0;
  const remaining = Math.max(0, limit - used);
  const limitReached = used >= limit;

  async function send(message?: string) {
    const text = (message ?? input).trim();
    if (!text || busy || limitReached) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ask-tutor", {
        body: {
          message: text,
          conversation_history: history,
          route_name: route.route_name,
          pillar_id: route.pillar_id,
          unit_id: pageContext?.unit_id ?? route.unit_id,
          session_id: pageContext?.session_id,
          anon_session_id: user ? undefined : anonId(),
        },
      });
      if (error) {
        const status = (error as any)?.context?.status;
        let body: any = null;
        try { body = await (error as any)?.context?.json?.(); } catch { /* ignore */ }
        if (status === 429 && body?.error === "visitor_cap_reached") {
          setMessages([...next, {
            role: "assistant",
            content: "I've had a lot of visitors today, so I'm pausing guest chats until tomorrow. Sign in (it's free) and I can keep helping you right away.",
            actions: [{ id: "sign_in", label: "Sign in", href: "/auth" }],
          }]);
          return;
        }
        if (status === 429) {
          setUsage({ used: limit, limit });
          toast.error(user ? "You've used today's free messages." : "Visitor limit reached — sign in to keep chatting.");
        } else if (status === 503) toast.error("Light Guide isn't configured yet.");
        else toast.error("Light Guide unavailable. Try again.");
        return;
      }
      const d = data as any;
      const actions: GuideAction[] = Array.isArray(d?.actions)
        ? d.actions.filter((a: any) => typeof a?.href === "string" && a.href.startsWith("/") && !a.href.startsWith("//")).slice(0, 2)
        : [];
      setMessages([...next, { role: "assistant", content: d?.reply ?? "…", actions }]);
      if (d?.limit) setUsage({ used: d.used, limit: d.limit });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  const subtitle = route.route_name === "session" && pageContext
    ? [pageContext.pillar_name, pageContext.unit_title, pageContext.session_title].filter(Boolean).join(" > ")
    : route.label;
  const intro = route.route_name === "session"
    ? "I'm your Light Guide. Ask me anything about this session."
    : user ? "I'm your Light Guide. Ask me anything about your journey on Genlink."
    : "I'm the Light Guide. Ask me what Genlink is, the pillars, or how the assessment works.";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-primary/30 lg:hidden" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="false"
        aria-labelledby="light-guide-title"
        className={cn(
          "fixed z-50 h-dvh max-h-dvh overflow-hidden border-l shadow-2xl flex flex-col bg-tutor",
          "inset-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[400px]",
        )}
      >
        <div className="shrink-0 p-4 border-b border-primary-foreground/15 bg-primary text-primary-foreground flex items-center gap-3">
          <LightGuide size={52} />
          <div className="flex-1 min-w-0">
            <p id="light-guide-title" className="font-bold">Light Guide</p>
            <p title={subtitle} className="text-xs text-primary-foreground/70 truncate">{subtitle}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close Light Guide" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><X className="w-4 h-4" /></Button>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 bg-tutor" aria-live="polite">
          {messages.length === 0 && !busy && (
            <div className="h-full min-h-72 flex flex-col items-center justify-center text-center px-4">
              <LightGuide size={72} />
              <p className="mt-4 text-sm font-medium text-primary">{intro}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {startersFor(route.route_name, Boolean(user)).map((starter) => (
                  <Button key={starter} type="button" variant="outline" size="sm" onClick={() => send(starter)} className="h-auto whitespace-normal border-premium/60 bg-tutor-field py-2 text-primary hover:bg-premium/15 hover:text-primary">
                    {starter}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm max-w-[80%] whitespace-pre-wrap">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2">
                <LightGuide size={28} static />
                <div className="max-w-[80%] space-y-2">
                  <div className="bg-card border-l-[3px] border-premium rounded-r-2xl rounded-bl-2xl px-3.5 py-2 text-sm whitespace-pre-wrap text-foreground shadow-sm">{m.content}</div>
                  {m.actions && m.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {m.actions.map((a) => (
                        <Button key={a.id} size="sm" onClick={() => { navigate(a.href); if (window.matchMedia("(max-width: 1023px)").matches) onClose(); }} className="h-8 bg-premium text-premium-foreground hover:bg-premium/90">
                          {a.label} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}

          {busy && (
            <div className="flex items-start gap-2">
              <LightGuide size={28} intense />
              <div className="bg-card border-l-[3px] border-premium rounded-r-2xl rounded-bl-2xl px-4 py-3 shadow-sm" role="status" aria-label="Light Guide is thinking">
                <span className="lg-thinking-dot" /><span className="lg-thinking-dot" /><span className="lg-thinking-dot" />
              </div>
            </div>
          )}
        </div>

        <div className="light-guide-input shrink-0 border-t border-premium/25 bg-tutor-field p-3">
          <p className="mb-2 text-xs font-medium text-primary">
            {remaining} of {limit} free messages left {user ? "today" : "this visit"}
            {!user && limitReached && <> — <button className="underline" onClick={() => { navigate("/auth"); onClose(); }}>sign in</button> to continue</>}
          </p>
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={limitReached ? "Message limit reached" : "Ask the Light Guide…"}
              aria-label="Message the Light Guide"
              disabled={busy || limitReached}
              rows={2}
              className="min-h-[64px] resize-none border-premium/30 bg-tutor-field focus-visible:ring-premium focus-visible:ring-offset-0"
            />
            <Button size="icon" onClick={() => send()} disabled={busy || !input.trim() || limitReached} aria-label="Send message" className="shrink-0 bg-premium text-premium-foreground hover:bg-premium/90 disabled:bg-muted disabled:text-muted-foreground">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
