"use client";

// Celebrates each find like a coin pickup: confetti and a label at the pointer,
// eggs that spray out and fly home to the visitor's avatar (`EggCatcher`),
// which pops as each lands. Once the last egg of the last find lands the
// visitor's own color turns gold, so every room draws them gold too.
import type { RefObject } from "react";
import {
  createContext,
  memo,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { animate, motion, useReducedMotion } from "motion/react";

import { CURSOR_ARROW } from "@/components/cursor";
import { lastPointer } from "@/lib/pointer";
import { GOLD, gradientOf, ownColorName, setOwnColorName, subscribeToOwnColor } from "@/lib/color";
import type { Confetto, SprayedEgg } from "./burst";
import { burstOf } from "./burst";
import { EASTER_EGGS, foundEggs, subscribeToEggs } from "./store";

const TOTAL = EASTER_EGGS.length;

const GOLD_BACKGROUND = gradientOf(GOLD);

/** The gold pointer arrow, the site's own cursor shape. */
const GOLD_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="-1 -1 20 26"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD.hue}"/><stop offset="1" stop-color="${GOLD.color}"/></linearGradient></defs><path d="${CURSOR_ARROW}" fill="url(#g)" stroke="${GOLD.color}" stroke-width="1.5"/></svg>`,
)}") 2 2, auto`;

interface Point {
  x: number;
  y: number;
}

interface Burst {
  id: number;
  label: string;
  from: Point;
  to: Point;
  confetti: Confetto[];
  eggs: SprayedEgg[];
}

interface EggsState {
  count: number;
  /** Eggs are in the air, on their way to the avatar. */
  catching: boolean;
  /** Every egg found and landed: this visitor is gold. */
  gilded: boolean;
  catcher: RefObject<HTMLSpanElement | null>;
}

const EggsContext = createContext<EggsState>({
  catcher: { current: null },
  catching: false,
  count: 0,
  gilded: false,
});

const isGold = () => ownColorName() === "gold";
const notGold = () => false;

/** Whether the avatar should be wide awake: catching eggs, or gold. */
export const useEggsAwake = () => {
  const { catching, gilded } = use(EggsContext);
  return catching || gilded;
};

/** The avatar's own dot, wrapped: where the eggs fly, what pops, and the gold halo. */
export const EggCatcher = ({ children }: { children: React.ReactNode }) => {
  const { catcher, gilded } = use(EggsContext);
  return (
    <span
      ref={catcher}
      className="relative flex size-full items-center justify-center rounded-full"
      style={
        gilded
          ? {
              boxShadow: `0 0 0 2px var(--bg-color), 0 0 0 3.5px ${GOLD.color}, 0 0 12px ${GOLD.hue}`,
            }
          : undefined
      }
    >
      {children}
      {gilded && <span className="absolute text-xs text-[#111]">✦</span>}
    </span>
  );
};

/** How far along the hunt is, for the avatar's tooltip. */
export const EggProgress = () => {
  const { count, gilded } = use(EggsContext);
  if (count === 0) {
    return null;
  }
  return (
    <span className="block text-[var(--body-color-faded)]">
      {gilded ? "Every easter egg found" : `${count}/${TOTAL} easter eggs`}
    </span>
  );
};

interface BurstProps {
  burst: Burst;
  gradient: string;
  onLand: () => void;
  onDone: (id: number) => void;
}

/** Confetti and the label pop at the pointer; the eggs spray out, then fly home one at a time. */
const BurstPieces = ({ burst, gradient, onLand, onDone }: BurstProps) => {
  const home = { x: burst.to.x - burst.from.x, y: burst.to.y - burst.from.y };
  const last = burst.eggs.length - 1;
  return (
    <div className="absolute" style={{ left: burst.from.x, top: burst.from.y }}>
      <motion.span
        className="absolute bottom-6 left-0 rounded-full px-2 py-0.5 text-xs leading-snug font-medium whitespace-nowrap text-[#111] shadow-lg"
        style={{ background: GOLD_BACKGROUND }}
        initial={{ opacity: 0, scale: 0.3, x: "-50%", y: 0 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [0.3, 1.15, 1, 1],
          x: "-50%",
          y: [0, -20, -28, -52],
        }}
        // Done before the last egg lands, which ends the burst.
        transition={{ duration: 1.35, ease: "easeOut", times: [0, 0.18, 0.75, 1] }}
      >
        {burst.label}
      </motion.span>
      {burst.confetti.map((bit, index) => (
        <motion.span
          key={index}
          className="absolute -translate-1/2 rounded-[1px]"
          style={{ background: bit.color, height: bit.wide ? 5 : 8, width: bit.wide ? 12 : 8 }}
          initial={{ opacity: 1, rotate: 0, x: 0, y: 0 }}
          animate={{
            opacity: [1, 1, 0],
            rotate: bit.rotate,
            x: [0, bit.x * 0.7, bit.x],
            y: [0, bit.up, bit.fall],
          }}
          transition={{
            duration: 1.3,
            ease: ["easeOut", "easeIn"],
            opacity: { duration: 1.3, times: [0, 0.7, 1] },
            times: [0, 0.35, 1],
          }}
        />
      ))}
      {burst.eggs.map((egg, index) => (
        <motion.svg
          key={index}
          viewBox="0 0 24 24"
          className="absolute size-7 -translate-1/2 drop-shadow-md"
          initial={{ rotate: 0, scale: 0.3, x: 0, y: 0 }}
          animate={{
            rotate: [0, egg.tilt, 0],
            scale: [0.3, 1.3, 0.5],
            x: [0, egg.x, home.x],
            y: [0, egg.y, home.y],
          }}
          transition={{
            delay: egg.delay,
            duration: 1.05,
            ease: ["easeOut", "easeIn"],
            times: [0, 0.35, 1],
          }}
          onAnimationComplete={() => {
            onLand();
            if (index === last) {
              onDone(burst.id);
            }
          }}
        >
          <path
            d="M12 2C8 2 4.5 8.5 4.5 14a7.5 7.5 0 0 0 15 0C19.5 8.5 16 2 12 2Z"
            fill={`url(#${gradient})`}
            stroke={GOLD.color}
            strokeWidth="1.5"
          />
        </motion.svg>
      ))}
    </div>
  );
};

const BurstView = memo(BurstPieces);

export const EasterEggProvider = ({ children }: { children: React.ReactNode }) => {
  const found = useSyncExternalStore(subscribeToEggs, foundEggs, foundEggs);
  const gilded = useSyncExternalStore(subscribeToOwnColor, isGold, notGold);
  const still = useReducedMotion() ?? false;
  const [bursts, setBursts] = useState<Burst[]>([]);
  const catcher = useRef<HTMLSpanElement | null>(null);
  // useId's punctuation isn't safe inside url(#…).
  const gradient = `egg-${useId().replaceAll(/[^\w-]/gu, "")}`;

  /** The avatar catches an egg. */
  const pop = useCallback(() => {
    if (catcher.current) {
      animate(catcher.current, { scale: [1, 1.4, 1] }, { duration: 0.28, ease: "easeOut" });
    }
  }, []);

  // Finds celebrated so far: a page can find one as it mounts, before this
  // provider's effects subscribe (children's effects run first).
  const heard = useRef(0);

  useEffect(() => {
    if (still) {
      const popNew = () => {
        if (foundEggs().length > heard.current) {
          heard.current = foundEggs().length;
          pop();
        }
      };
      popNew();
      return subscribeToEggs(popNew);
    }
    let next = 0;
    const celebrate = () => {
      if (foundEggs().length <= heard.current) {
        return;
      }
      heard.current = foundEggs().length;
      const count = foundEggs().length;
      const rect = catcher.current?.getBoundingClientRect();
      const to = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth - 40, y: 40 };
      next += 1;
      const burst = {
        ...burstOf(),
        // The burst comes out of the pointer, or the middle if it hasn't moved yet.
        from: lastPointer() ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        id: next,
        label:
          count === TOTAL ? "Every easter egg found!" : `Easter egg discovered! ${count}/${TOTAL}`,
        to,
      };
      setBursts((current) => [...current, burst]);
    };
    celebrate();
    return subscribeToEggs(celebrate);
  }, [still, pop]);

  const done = useCallback(
    (id: number) => setBursts((current) => current.filter((burst) => burst.id !== id)),
    [],
  );

  const catching = bursts.length > 0;

  // Gold once every egg is found and the last of them has landed.
  useEffect(() => {
    if (found.length === TOTAL && !catching) {
      setOwnColorName("gold");
    }
  }, [found, catching]);

  // The page's own pointer turns gold with them.
  useEffect(() => {
    if (!gilded) {
      return;
    }
    document.documentElement.style.cursor = GOLD_CURSOR;
    return () => {
      document.documentElement.style.cursor = "";
    };
  }, [gilded]);

  const value = useMemo(
    () => ({ catcher, catching, count: found.length, gilded }),
    [catching, found, gilded],
  );

  return (
    <EggsContext value={value}>
      {children}
      {catching && (
        <div
          className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
          aria-hidden="true"
        >
          <svg className="absolute size-0">
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={GOLD.hue} />
              <stop offset="1" stopColor={GOLD.color} />
            </linearGradient>
          </svg>
          {bursts.map((burst) => (
            <BurstView
              key={burst.id}
              burst={burst}
              gradient={gradient}
              onLand={pop}
              onDone={done}
            />
          ))}
        </div>
      )}
    </EggsContext>
  );
};
