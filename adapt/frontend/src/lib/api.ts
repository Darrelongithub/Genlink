/**
 * One place where the browser talks to the backend.
 *
 * Three rules this file exists to enforce:
 *
 * 1. **The CSRF header goes on every mutation.** The backend refuses state-changing
 *    calls without it, and a UI that forgets it once fails in a way that looks like a
 *    login problem. Here it is automatic.
 * 2. **Errors stay errors.** `ApiError` carries the status and the backend's own
 *    `detail`, so a page can show "no local speech model installed" instead of a
 *    spinner that never ends. Nothing here invents a fallback payload.
 * 3. **`?mock=1` is loud.** The mock flag exists so the design can be reviewed without
 *    a backend; when it is on, every response comes from recorded fixtures and the
 *    banner in the layout says so on every screen.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

import { apiErrorSentence } from "./apiCopy";
import { mockLookup } from "./mock";

export const CSRF_COOKIE = "adapt_csrf";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
  /** The sentence to put on screen — see `apiCopy.ts` for the rule and its tests. */
  get shown(): string {
    return apiErrorSentence(this.status, this.message, this.detail);
  }
}

export function cookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function csrfToken(): string | null {
  return cookieValue(CSRF_COOKIE);
}

/** sessionStorage that cannot throw. Safari private windows (and in-app
 *  browsers with storage blocked) throw on `setItem`/`getItem`; because
 *  `isMock()` runs inside every API call, that one throw used to take down
 *  every screen for exactly those browsers. Storage here is a convenience
 *  cache for one flag -- losing it must lose nothing else. */
const safeSession = {
  get(key: string): string | null {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      /* storage unavailable: the in-memory flag below still holds for this page */
    }
  },
  remove(key: string): void {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* as above */
    }
  },
};

let mockFlag: boolean | null = null;

/** True when the page was opened with `?mock=1` (kept in sessionStorage so it survives navigation). */
export function isMock(): boolean {
  if (mockFlag !== null) return mockFlag;
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const inUrl = url.searchParams.get("mock");
  if (inUrl === "1" || inUrl === "true") {
    safeSession.set("adapt-mock", "1");
    mockFlag = true;
  } else if (inUrl) {
    safeSession.remove("adapt-mock");
    mockFlag = false;
  } else {
    mockFlag = safeSession.get("adapt-mock") === "1";
  }
  return mockFlag;
}

/** How long to wait before retrying a refused *read*, from the server's own
 *  `Retry-After` when it sends one (the rate limiter does), capped so a page
 *  never parks on a misbehaving value. A small random spread is added by the
 *  caller so a whole room does not retry in lockstep. */
function retryWaitMs(res: Response | null, attempt: number): number {
  const header = res?.headers.get("retry-after");
  const seconds = header ? Number.parseFloat(header) : Number.NaN;
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 5_000);
  return 400 * (attempt + 1);
}

/** Reads may be retried through a moment of overload; writes may not.
 *  A 429/502/503 on a GET during a whole-room page switch is a queue, not a
 *  failure -- retrying it quietly is the difference between "the page took a
 *  breath" and an error screen. A mutation is never resent automatically:
 *  the server may have recorded it, and a duplicate answer is worse than an
 *  honest error the learner can act on. */
const RETRYABLE_STATUSES = new Set([429, 502, 503]);
const MAX_GET_RETRIES = 2;

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  json?: unknown;
  form?: FormData;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  /** attach the CSRF token even on a safe method. No longer required — the backend only
   *  checks CSRF on mutating methods — but harmless, and it keeps a read that spoils a
   *  question (/items/{id}/reveal) visibly marked as a deliberate act at the call site. */
  csrf?: boolean;
};

export function qs(query?: Options["query"]): string {
  if (!query) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function api<T = Record<string, unknown>>(path: string, opts: Options = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const url = `/api/v1/${path.replace(/^\/?api\/v1\/?/, "").replace(/^\/+/, "")}`;
  if (isMock()) {
    const found = mockLookup(method, url + qs(opts.query));
    if (!found.found) throw new ApiError(404, `mock: no fixture for ${method} ${url}`);
    if (found.error) throw new ApiError(found.status ?? 400, found.error.message, found.error.detail);
    return found.body as T;
  }
  const headers: Record<string, string> = { accept: "application/json", ...(opts.headers ?? {}) };
  // `csrf` is opt-in on safe methods. The backend checks the token only on mutating
  // methods (POST/PUT/PATCH/DELETE), so a GET never needs one — this used to say
  // otherwise because `rate()` depended on `require_csrf` and every rate-limited read
  // inherited the mutation rule, which 403'd the pack/breakdown fetches below. Sending
  // the token on a safe method is still allowed, so `csrf: true` stays as documentation
  // of "this read has a side effect on what the learner sees", not as a requirement.
  if (method !== "GET" || opts.csrf) {
    const token = csrfToken();
    if (token) headers["x-csrf-token"] = token;
  }
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.json);
  }
  // A request that never answers must not disable the page forever. The games lock their controls
  // while a submission is in flight, so a hung fetch used to look exactly like "it won't let me
  // click" — the learner had no way back except a reload.
  const retryable = method === "GET";
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    try {
      res = await fetch(url + qs(opts.query), {
        method,
        headers,
        body,
        credentials: "same-origin",
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const aborted = (err as Error)?.name === "AbortError";
      // A network-level failure on a read (wifi blip, proxy restart under a
      // full room) gets the same quiet retry as an overload refusal below.
      // A timeout we imposed ourselves does not: 25s of silence is a real
      // answer about the backend's state, and retrying just triples it.
      if (retryable && !aborted && attempt < MAX_GET_RETRIES) {
        await new Promise((r) => setTimeout(r, retryWaitMs(null, attempt) + Math.random() * 250));
        continue;
      }
      throw new ApiError(
        0,
        aborted
          ? "the backend did not answer in 25 seconds, so the request was stopped — nothing was recorded; try again"
          : `the backend is not reachable from the browser (${(err as Error).message})`,
      );
    }
    clearTimeout(timer);
    if (retryable && RETRYABLE_STATUSES.has(res.status) && attempt < MAX_GET_RETRIES) {
      const wait = retryWaitMs(res, attempt) + Math.random() * 250;
      await res.text().catch(() => ""); // drain the body so the connection can be reused
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    const text = await res.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
    if (!res.ok) {
      const detail =
        payload && typeof payload === "object" && "detail" in (payload as Record<string, unknown>)
          ? (payload as Record<string, unknown>).detail
          : payload;
      throw new ApiError(res.status, `${method} ${url} -> ${res.status}`, detail);
    }
    return payload as T;
  }
}

/** GET with the failure kept as data, for screens that should still render their frame. */
export async function get<T = Record<string, unknown>>(
  path: string,
  query?: Options["query"],
): Promise<{ data: T | null; error: string | null; status: number | null }> {
  try {
    return { data: await api<T>(path, { query }), error: null, status: 200 };
  } catch (err) {
    const e = err as ApiError;
    return { data: null, error: e.shown ?? String(err), status: e.status ?? null };
  }
}

export const post = <T = Record<string, unknown>>(path: string, json?: unknown, query?: Options["query"]) =>
  api<T>(path, { method: "POST", json: json ?? {}, query });

export const del = <T = Record<string, unknown>>(path: string, json?: unknown) =>
  api<T>(path, { method: "DELETE", json: json ?? {} });

export type Load<T> = { data: T | null; error: string | null; status: number | null; loading: boolean; reload: () => void };

export function useApi<T = Record<string, unknown>>(path: string | null, query?: Options["query"]): Load<T> {
  const [state, setState] = useState<{ data: T | null; error: string | null; status: number | null; loading: boolean }>({
    data: null,
    error: null,
    status: null,
    loading: path !== null,
  });
  const [tick, setTick] = useState(0);
  const key = JSON.stringify([path, query ?? null, tick]);

  useEffect(() => {
    let alive = true;
    if (!path) {
      setState({ data: null, error: null, status: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    get<T>(path, query).then((r) => {
      if (alive) setState({ ...r, loading: false });
    });
    return () => {
      alive = false;
    };
    // The path/query/tick tuple is the whole dependency set: `query` is a fresh object
    // on most renders, so depending on it directly would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}

/** Who is this browser? `null` means signed out, and every page has to handle that. */
export type Me = {
  student_id: string;
  display_name: string;
  role: string;
  onboarding_complete: boolean;
  diagnostic_complete: boolean;
  baseline_started?: boolean;
  voice_enabled: boolean;
  voice_gender: string;
  language: string;
  consent_analytics: boolean;
  consent_share_with_ai: boolean;
  sessions: number;
};


export async function logout(): Promise<void> {
  try {
    await post("logout");
  } catch {
    /* already signed out */
  }
}
