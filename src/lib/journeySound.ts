import { useEffect, useState } from "react";

const KEY = "genlink:journey-sound";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(KEY);
  return v === null ? true : v === "1";
}

export function setSoundEnabled(on: boolean) {
  try { window.localStorage.setItem(KEY, on ? "1" : "0"); } catch {}
  window.dispatchEvent(new CustomEvent("genlink-sound-change", { detail: on }));
}

export function useSoundPref(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => isSoundEnabled());
  useEffect(() => {
    const fromEvent = (e: Event) => setOn((e as CustomEvent).detail);
    const fromStorage = (e: StorageEvent) => { if (e.key === KEY) setOn(e.newValue !== "0"); };
    window.addEventListener("genlink-sound-change", fromEvent as EventListener);
    window.addEventListener("storage", fromStorage);
    return () => {
      window.removeEventListener("genlink-sound-change", fromEvent as EventListener);
      window.removeEventListener("storage", fromStorage);
    };
  }, []);
  return [on, (v) => { setSoundEnabled(v); setOn(v); }];
}

export function playUnlockChime() {
  if (!isSoundEnabled()) return;
  if (typeof window === "undefined") return;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  try {
    const ctx = new AC();
    const now = ctx.currentTime;
    const play = (freq: number, start: number, dur: number, gain = 0.18) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.exponentialRampToValueAtTime(gain, now + start + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.connect(g).connect(ctx.destination);
      o.start(now + start);
      o.stop(now + start + dur + 0.02);
    };
    play(880, 0, 0.5);
    play(1318.5, 0.12, 0.6);
    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch { /* no-op */ }
}