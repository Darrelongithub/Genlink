import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface BadgePayload {
  name: string;
  description: string;
}

export interface AwardArgs {
  amount: number;
  /** Optional source element — the "+XP" floater spawns from its center. */
  originEl?: HTMLElement | null;
  /** True when this award crossed a level threshold. */
  leveledUp?: boolean;
  newLevel?: number;
  badge?: BadgePayload;
}

interface Floater {
  id: number;
  amount: number;
  x: number;
  y: number;
}

interface XPRewardContextValue {
  totalXP: number;
  /** The animated counter value (rolls up). */
  displayedXP: number;
  level: number;
  setBaseline: (xp: number, level: number) => void;
  award: (args: AwardArgs) => void;
  floaters: Floater[];
  showLevelUp: boolean;
  levelUpValue: number;
  badge: BadgePayload | null;
  dismissBadge: () => void;
}

const XPRewardContext = createContext<XPRewardContextValue | undefined>(undefined);

const COUNT_DURATION = 1000;

export const XPRewardProvider = ({ children }: { children: ReactNode }) => {
  const [totalXP, setTotalXP] = useState(0);
  const [displayedXP, setDisplayedXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpValue, setLevelUpValue] = useState(1);
  const [badge, setBadge] = useState<BadgePayload | null>(null);

  const rafRef = useRef<number | null>(null);
  const floaterId = useRef(0);

  const setBaseline = useCallback((xp: number, lvl: number) => {
    setTotalXP(xp);
    setDisplayedXP(xp);
    setLevel(lvl);
  }, []);

  const animateCounter = useCallback((from: number, to: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_DURATION);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayedXP(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const award = useCallback(
    ({ amount, originEl, leveledUp, newLevel, badge: b }: AwardArgs) => {
      if (amount <= 0) return;

      // Floater position — default to top-right if no origin.
      let x = window.innerWidth - 80;
      let y = 80;
      if (originEl) {
        const r = originEl.getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top + r.height / 2;
      }
      const id = ++floaterId.current;
      setFloaters((f) => [...f, { id, amount, x, y }]);
      window.setTimeout(() => {
        setFloaters((f) => f.filter((fl) => fl.id !== id));
      }, 1400);

      setTotalXP((prev) => {
        const next = prev + amount;
        animateCounter(prev, next);
        return next;
      });

      if (leveledUp) {
        if (newLevel) setLevel(newLevel);
        setLevelUpValue(newLevel ?? level + 1);
        setShowLevelUp(true);
        window.setTimeout(() => setShowLevelUp(false), 2000);
      }

      if (b) setBadge(b);
    },
    [animateCounter, level],
  );

  const dismissBadge = useCallback(() => setBadge(null), []);

  return (
    <XPRewardContext.Provider
      value={{
        totalXP,
        displayedXP,
        level,
        setBaseline,
        award,
        floaters,
        showLevelUp,
        levelUpValue,
        badge,
        dismissBadge,
      }}
    >
      {children}
    </XPRewardContext.Provider>
  );
};

export const useXPReward = () => {
  const ctx = useContext(XPRewardContext);
  if (!ctx) throw new Error("useXPReward must be used within XPRewardProvider");
  return ctx;
};