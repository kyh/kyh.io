"use client";

// Celebrates each find like a coin pickup: confetti (`confetti.ts`) and a label at the pointer,
// eggs (or the season's pieces, src/seasons: bats over Halloween) that spray
// out and fly home to the visitor's avatar (`EggCatcher`),
// which pops as each lands. Once the last egg of the last find lands the
// visitor's own color turns gold, so every room draws them gold too.
import type { RefObject } from "react";
import {
  createContext,
  memo,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";

import { CURSOR_ARROW } from "@/components/cursor";
import { PieceDefs, PieceLayers, usePieceId } from "@/seasons/piece";
import type { SeasonId } from "@/seasons/seasons";
import { seasonOf } from "@/seasons/seasons";
import { currentSeason } from "@/seasons/store";
import { lastPointer } from "@/lib/pointer";
import { GOLD, gradientOf, ownColorName, setOwnColorName, subscribeToOwnColor } from "@/lib/color";
import type { SprayedEgg } from "./burst";
import { burstOf } from "./burst";
import { throwConfettiAt } from "./confetti";
import { foundEggs, huntedEggs, progressOf, subscribeToEggs } from "./store";

/** This visitor's hunt: a phone with no keyboard can't send a chat line. */
const hunt = () =>
  huntedEggs(
    typeof window !== "undefined" &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches,
  );

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
  eggs: SprayedEgg[];
  /** What it throws, fixed at the find so a switch mid-flight doesn't swap them. */
  season: SeasonId;
}

interface EggsState {
  count: number;
  total: number;
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
  total: 0,
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
  const { count, gilded, total } = use(EggsContext);
  if (count === 0) {
    return null;
  }
  return (
    <span className="block text-[var(--body-color-faded)]">
      {gilded ? "Every easter egg found" : `${count}/${total} easter eggs`}
    </span>
  );
};

interface BurstProps {
  burst: Burst;
  /** The id the pieces' gradients are under, per season. */
  pieceId: string;
  onLand: () => void;
  onDone: (id: number) => void;
}

/** How long the label stands before it pops back out, in ms: gone before the last egg lands, which ends the burst. */
const LABEL_HOLD = 900;

/** The label bounces up out of the pointer, holds, then pops back in. */
const BurstLabel = ({ label }: { label: string }) => {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(false), LABEL_HOLD);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <span className="absolute bottom-6 left-0 -translate-x-1/2">
      <AnimatePresence>
        {shown && (
          <motion.span
            className="block origin-bottom rounded-full px-2 py-0.5 text-xs leading-snug font-medium whitespace-nowrap text-[#111] shadow-lg"
            style={{ background: GOLD_BACKGROUND }}
            initial={{ scale: 0 }}
            animate={{
              scale: 1,
              transition: { bounce: 0.5, type: "spring", visualDuration: 0.35 },
            }}
            exit={{ scale: 0, transition: { duration: 0.2, ease: "backIn" } }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};

/** The label pops at the pointer; the eggs spray out, then fly home one at a time. */
const BurstPieces = ({ burst, pieceId, onLand, onDone }: BurstProps) => {
  const { art } = seasonOf(burst.season);
  const home = { x: burst.to.x - burst.from.x, y: burst.to.y - burst.from.y };
  const last = burst.eggs.length - 1;
  return (
    <div className="absolute" style={{ left: burst.from.x, top: burst.from.y }}>
      <BurstLabel label={burst.label} />
      {burst.eggs.map((egg, index) => (
        <motion.svg
          key={index}
          viewBox="0 0 24 24"
          className="absolute size-7 -translate-1/2"
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
          <PieceLayers art={art} id={`${pieceId}-${burst.season}`} />
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
  const pieceId = usePieceId();

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
      const { count, done, total } = progressOf(foundEggs(), hunt());
      const rect = catcher.current?.getBoundingClientRect();
      const to = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth - 40, y: 40 };
      next += 1;
      // The burst comes out of the pointer, or the middle if it hasn't moved yet.
      const from = lastPointer() ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const season = currentSeason();
      throwConfettiAt(from, seasonOf(season).confetti);
      const burst = {
        ...burstOf(),
        from,
        id: next,
        label: done ? "Every easter egg found!" : `Easter egg discovered! ${count}/${total}`,
        season,
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
  const seasons = [...new Set(bursts.map((burst) => burst.season))];

  // Gold once every egg is found and the last of them has landed.
  useEffect(() => {
    if (progressOf(found, hunt()).done && !catching) {
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
    () => ({ catcher, catching, gilded, ...progressOf(found, hunt()) }),
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
            <defs>
              {seasons.map((season) => (
                <PieceDefs key={season} art={seasonOf(season).art} id={`${pieceId}-${season}`} />
              ))}
            </defs>
          </svg>
          {bursts.map((burst) => (
            <BurstView key={burst.id} burst={burst} pieceId={pieceId} onLand={pop} onDone={done} />
          ))}
        </div>
      )}
    </EggsContext>
  );
};
