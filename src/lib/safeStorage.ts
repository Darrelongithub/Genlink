/**
 * Web Storage + id generation that cannot throw.
 *
 * Two browser facts this file exists for:
 *
 * 1. **Storage throws on some Apple setups.** Safari private windows and
 *    in-app browsers with storage blocked raise on `setItem` (and sometimes
 *    `getItem`). Every flag stored through here is a convenience ("splash
 *    already played", "hint dismissed") -- none of them is worth crashing
 *    the page that reads it, which is what an unguarded call in a render or
 *    an effect used to do.
 * 2. **`crypto.randomUUID` needs a secure context.** On a plain-http LAN
 *    address (how a class joins the host machine) it is `undefined` in
 *    Safari, so calling it throws a TypeError -- on iPhones and Macs only,
 *    and only off localhost, which made it invisible in development.
 *    `makeId` degrades to `getRandomValues` (available everywhere) and
 *    finally to a time+random string: these ids name anonymous tutor
 *    sessions, they are not credentials.
 */

function get(storage: Storage | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function set(storage: Storage | undefined, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    /* storage unavailable: the caller continues without persistence */
  }
}

export const safeSessionGet = (key: string): string | null =>
  get(typeof window === "undefined" ? undefined : window.sessionStorage, key);

export const safeSessionSet = (key: string, value: string): void =>
  set(typeof window === "undefined" ? undefined : window.sessionStorage, key, value);

export const safeLocalGet = (key: string): string | null =>
  get(typeof window === "undefined" ? undefined : window.localStorage, key);

export const safeLocalSet = (key: string, value: string): void =>
  set(typeof window === "undefined" ? undefined : window.localStorage, key, value);

export function makeId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const bytes = c.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
