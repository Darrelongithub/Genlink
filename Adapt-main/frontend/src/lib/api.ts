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

import { useEffect, useState } from "react";

import { apiErrorSentence, statusFallbackSentence } from "./apiCopy";

export const CSRF_COOKIE = "adapt_csrf";
export const UNAUTHORIZED_EVENT = "adapt:unauthorized";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    const clean = apiErrorSentence(status, message, detail);
    super(clean);
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
  try {
    for (const part of document.cookie.split(";")) {
      const [k, ...rest] = part.trim().split("=");
      if (k === name) return decodeURIComponent(rest.join("="));
    }
  } catch {
    return null;
  }
  return null;
}

export function csrfToken(): string | null {
  return cookieValue(CSRF_COOKIE);
}

let memoryMockFlag = false;

/** True when the page was opened with `?mock=1` (kept in sessionStorage so it survives navigation). */
export function isMock(): boolean {
  if (typeof window === "undefined") return false;
  let inUrl: string | null = null;
  try {
    inUrl = new URL(window.location.href).searchParams.get("mock");
  } catch {
    inUrl = null;
  }
  if (inUrl === "1" || inUrl === "true") {
    memoryMockFlag = true;
    try {
      window.sessionStorage.setItem("adapt-mock", "1");
    } catch {
      /* sessionStorage blocked — keep tab-scoped flag in memory */
    }
    return true;
  }
  if (inUrl) {
    memoryMockFlag = false;
    try {
      window.sessionStorage.removeItem("adapt-mock");
    } catch {
      /* sessionStorage blocked */
    }
    return false;
  }
  try {
    return window.sessionStorage.getItem("adapt-mock") === "1" || memoryMockFlag;
  } catch {
    return memoryMockFlag;
  }
}

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
  /** Optional caller abort signal (e.g., on component unmount or route change). */
  signal?: AbortSignal;
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

const AUTH_PROBE_PATHS = new Set([
  "/api/v1/me",
  "/api/v1/login",
  "/api/v1/register",
  "/api/v1/guest",
  "/api/v1/logout",
]);

export async function api<T = Record<string, unknown>>(path: string, opts: Options = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const url = `/api/v1/${path.replace(/^\/?api\/v1\/?/, "").replace(/^\/+/, "")}`;
  if (isMock()) {
    const { mockLookup } = await import("./mock");
    const found = mockLookup(method, url + qs(opts.query));
    if (!found.found) throw new ApiError(404, "Sample preview does not include that item.");
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
  let res: Response;
  // A request that never answers must not disable the page forever. The games lock their controls
  // while a submission is in flight, so a hung fetch used to look exactly like "it won't let me
  // click" — the learner had no way back except a reload.
  const controller = new AbortController();
  let timedOut = false;
  const onCallerAbort = () => controller.abort();
  if (opts.signal) {
    if (opts.signal.aborted) {
      controller.abort();
    } else {
      opts.signal.addEventListener("abort", onCallerAbort, { once: true });
    }
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 25_000);
  try {
    res = await fetch(url + qs(opts.query), {
      method,
      headers,
      body,
      credentials: "same-origin",
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = (err as Error)?.name === "AbortError";
    if (aborted && opts.signal?.aborted && !timedOut) {
      throw new ApiError(0, "Request cancelled because you left this screen.");
    }
    throw new ApiError(
      0,
      aborted
        ? "the backend did not answer in 25 seconds, so the request was stopped — nothing was recorded; try again"
        : "The learning server could not be reached from your browser — check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
    if (opts.signal) {
      opts.signal.removeEventListener("abort", onCallerAbort);
    }
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
    if (res.status === 401 && typeof window !== "undefined" && !AUTH_PROBE_PATHS.has(url)) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(res.status, statusFallbackSentence(res.status), detail);
  }
  return payload as T;
}

/** GET with the failure kept as data, for screens that should still render their frame. */
export async function get<T = Record<string, unknown>>(
  path: string,
  query?: Options["query"],
  signal?: AbortSignal,
): Promise<{ data: T | null; error: string | null; status: number | null }> {
  try {
    return { data: await api<T>(path, { query, signal }), error: null, status: 200 };
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
    const abortController = new AbortController();
    if (!path) {
      setState({ data: null, error: null, status: null, loading: false });
      return () => abortController.abort();
    }
    setState((s) => ({ ...s, loading: true }));
    get<T>(path, query, abortController.signal).then((r) => {
      if (alive && !abortController.signal.aborted) {
        setState({ ...r, loading: false });
      }
    });
    return () => {
      alive = false;
      abortController.abort();
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
