"use client";

import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { animate, motion, useReducedMotion } from "motion/react";

import type { Confetto, SprayedEgg } from "@/lib/egg-burst";
import type { Found } from "@/lib/easter-eggs";
import { GOLD } from "@/lib/color";
import { burstOf } from "@/lib/egg-burst";
import { getEggs, getServerEggs, onDiscover, subscribeToEggs } from "@/lib/easter-egg-store";
import { EASTER_EGGS, isComplete } from "@/lib/easter-eggs";

/** The visitor's own avatar (`data-own-avatar`): where the eggs fly, and what pops as each lands. */
const OWN_AVATAR = "[data-own-avatar]";

interface EasterEggs {
  found: Found;
  total: number;
  /** Every egg found, and the last of them landed. */
  complete: boolean;
  /** Eggs are in the air, on their way to the avatar. */
  catching: boolean;
}

const EasterEggContext = createContext<EasterEggs>({
  catching: false,
  complete: false,
  found: [],
  total: EASTER_EGGS.length,
});

/** This visitor's found eggs; find one with `discoverEgg(id)` from anywhere. */
export const useEasterEggs = () => use(EasterEggContext);

interface Point {
  x: number;
  y: number;
}

interface Burst {
  id: number;
  /** What pops up at the pointer. */
  label: string;
  from: Point;
  to: Point;
  confetti: Confetto[];
  eggs: SprayedEgg[];
}

const ownAvatar = () => document.querySelector<HTMLElement>(OWN_AVATAR);

const avatarCenter = (): Point => {
  const rect = ownAvatar()?.getBoundingClientRect();
  return rect
    ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    : { x: window.innerWidth - 40, y: 40 };
};

/** The avatar catches an egg. */
const pop = () => {
  const avatar = ownAvatar();
  if (avatar) {
    animate(avatar, { scale: [1, 1.4, 1] }, { duration: 0.28, ease: "easeOut" });
  }
};

const GoldenEgg = () => (
  <svg viewBox="0 0 24 24" className="size-7 drop-shadow-md" aria-hidden="true">
    <defs>
      <linearGradient id="egg-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={GOLD.hue} />
        <stop offset="1" stopColor={GOLD.color} />
      </linearGradient>
    </defs>
    <path
      d="M12 2C8 2 4.5 8.5 4.5 14a7.5 7.5 0 0 0 15 0C19.5 8.5 16 2 12 2Z"
      fill="url(#egg-gold)"
      stroke="hsl(38, 90%, 36%)"
      strokeWidth="1.5"
    />
  </svg>
);

interface BurstProps {
  burst: Burst;
  onDone: (id: number) => void;
}

/** Confetti pops at the cursor; the eggs spray out, then fly home one at a time. */
const BurstView = ({ burst, onDone }: BurstProps) => {
  const home = { x: burst.to.x - burst.from.x, y: burst.to.y - burst.from.y };
  const last = burst.eggs.length - 1;
  return (
    <div className="absolute" style={{ left: burst.from.x, top: burst.from.y }}>
      <motion.span
        className="absolute bottom-6 left-0 rounded-full px-3 py-1 font-mono text-sm font-semibold whitespace-nowrap text-[#111] shadow-lg"
        style={{ background: `linear-gradient(${GOLD.hue}, ${GOLD.color})` }}
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
          style={{
            background: bit.color,
            height: bit.wide ? 5 : 8,
            width: bit.wide ? 12 : 8,
          }}
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
        <motion.span
          key={index}
          className="absolute -translate-1/2"
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
            pop();
            if (index === last) {
              onDone(burst.id);
            }
          }}
        >
          <GoldenEgg />
        </motion.span>
      ))}
    </div>
  );
};

/**
 * Keeps the found eggs and celebrates each new one like a coin pickup; turns
 * the visitor gold once they're all found and the last egg has landed.
 */
export const EasterEggProvider = ({ children }: { children: React.ReactNode }) => {
  const found = useSyncExternalStore(subscribeToEggs, getEggs, getServerEggs);
  const still = useReducedMotion() ?? false;
  const [bursts, setBursts] = useState<Burst[]>([]);
  const pointer = useRef<Point | null>(null);

  // Where the pointer last was: the burst comes out of it. Captured, so the town's own handlers can't hide it.
  useEffect(() => {
    const track = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", track, { capture: true, passive: true });
    window.addEventListener("pointerdown", track, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointermove", track, { capture: true });
      window.removeEventListener("pointerdown", track, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (still) {
      return onDiscover(pop);
    }
    let next = 0;
    return onDiscover(() => {
      const from = pointer.current ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const count = getEggs().length;
      const label =
        count === EASTER_EGGS.length
          ? "Every easter egg found!"
          : `Easter egg discovered! ${count}/${EASTER_EGGS.length}`;
      next += 1;
      setBursts((current) => [
        ...current,
        { ...burstOf(), from, id: next, label, to: avatarCenter() },
      ]);
    });
  }, [still]);

  const done = (id: number) => setBursts((current) => current.filter((burst) => burst.id !== id));

  const complete = isComplete(found) && bursts.length === 0;

  // The page-wide cursor turns gold (global.css).
  useEffect(() => {
    if (complete) {
      document.documentElement.dataset.eggs = "all";
    } else {
      delete document.documentElement.dataset.eggs;
    }
  }, [complete]);

  const catching = bursts.length > 0;
  const value = useMemo(
    () => ({ catching, complete, found, total: EASTER_EGGS.length }),
    [catching, complete, found],
  );

  return (
    <EasterEggContext value={value}>
      {children}
      {catching && (
        <div
          className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
          aria-hidden="true"
        >
          {bursts.map((burst) => (
            <BurstView key={burst.id} burst={burst} onDone={done} />
          ))}
        </div>
      )}
    </EasterEggContext>
  );
};
