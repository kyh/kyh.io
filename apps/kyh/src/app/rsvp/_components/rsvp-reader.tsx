"use client";

import { theme } from "../../../styles/tokens.stylex";

import { up as mediaUp } from "@repo/tailwind-compat/media.stylex";

import {
  colors,
  containers,
  defaults,
  fontSizeLineHeights,
  fontSizes,
  fontWeights,
  letterSpacing,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Counter } from "@/components/counter";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
  PauseIcon,
  PlayIcon,
} from "@/components/icons";
import { RSVP_CONTENT, RSVP_SETTINGS } from "./rsvp-config";

const styles = stylex.create({
  word: { display: "flex", alignItems: "center" },
  letter: { display: "inline-block", width: "0.6em", textAlign: "center" },
  orp: { color: colors.red500 },
  main: {
    display: "flex",
    minHeight: "100vh",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    padding: spacing[4],
  },
  guide: {
    backgroundColor: "color-mix(in oklab, var(--body-color-faded) 30%, transparent)",
    position: "absolute",
    top: 0,
    left: "50%",
    height: "100%",
    width: "1px",
    translate: "-50% 0",
  },
  stage: {
    position: "relative",
    display: "flex",
    height: spacing[32],
    width: "100%",
    maxWidth: containers["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  display: {
    fontFamily: defaults.monoFontFamily,
    fontSize: { default: fontSizes["5xl"], [mediaUp.md]: fontSizes["6xl"] },
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacing.tight,
  },
  controlButton: {
    borderColor: theme.border,
    borderWidth: 1,
    borderStyle: "solid",
    backgroundColor: { default: theme.background, ":hover": theme.backgroundFaded },
    position: "relative",
    display: "flex",
    width: spacing[12],
    height: spacing[12],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    transitionProperty:
      "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: ".15s",
  },
  mono: {
    fontFamily: defaults.monoFontFamily,
    fontSize: fontSizes.lg,
    lineHeight: fontSizeLineHeights.lg,
  },
  hudLeft: {
    color: theme.foregroundFaded,
    position: "fixed",
    bottom: "6dvh",
    left: spacing[12],
    display: { default: "none", [mediaUp.sm]: "block" },
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
  },
  hudRight: {
    color: theme.foregroundFaded,
    position: "fixed",
    right: spacing[12],
    bottom: "6dvh",
    display: { default: "none", [mediaUp.sm]: "block" },
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
  },
  counterRow: {
    marginBottom: spacing[2],
    display: "flex",
    alignItems: "center",
    fontVariantNumeric: "tabular-nums",
  },
  tight: { lineHeight: 1 },
  track: {
    backgroundColor: theme.border,
    height: spacing[1],
    width: spacing[32],
    overflow: "hidden",
    borderRadius: radii.full,
  },
  bar: {
    backgroundColor: theme.foregroundFaded,
    height: "100%",
    transitionProperty: "all",
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: ".15s",
  },
  keyRow: { display: "flex", alignItems: "center", gap: spacing[3] },
  keyGroup: { display: "flex", alignItems: "center", gap: spacing[1] },
  keyGroupTight: { display: "flex", alignItems: "center", gap: spacing[0.5] },
  kbd: {
    borderColor: theme.border,
    backgroundColor: theme.backgroundFaded,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.default,
    borderWidth: 1,
    borderStyle: "solid",
  },
  kbdWide: { paddingInline: spacing[1.5], paddingBlock: spacing[0.5] },
  kbdTight: { padding: spacing[1] },
  ml1: { marginLeft: spacing[1] },
});

type RSVPState =
  | { status: "countdown"; count: number }
  | { status: "playing"; wordIndex: number }
  | { status: "paused"; wordIndex: number }
  | { status: "finished" };

// ORP index lookup: [0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4...]
const ORP_THRESHOLDS = [1, 3, 5, 9, 13] as const;
const getORPIndex = (word: string): number => {
  const idx = ORP_THRESHOLDS.findIndex((t) => word.length <= t);
  return idx === -1 ? 4 : idx;
};

const getWordDuration = (word: string): number => {
  const { baseTime, timePerChar, punctuationMultiplier, commaMultiplier } = RSVP_SETTINGS;
  const duration = baseTime + word.length * timePerChar;
  const lastChar = word.slice(-1);
  if (/[.!?]/.test(lastChar)) return duration * punctuationMultiplier;
  if (lastChar === ",") return duration * commaMultiplier;
  return duration;
};

const getCurrentIndex = (state: RSVPState, totalWords: number): number => {
  if (state.status === "playing" || state.status === "paused") return state.wordIndex;
  if (state.status === "finished") return totalWords - 1;
  return 0;
};

// Word display component
const WordDisplay = ({ word, orpIndex }: { word: string; orpIndex: number }) => {
  const letters = word.split("");
  const offset = (orpIndex + 0.5 - letters.length / 2) * 0.6;

  return (
    <div {...stylex.props(styles.word)} style={{ transform: `translateX(${-offset}em)` }}>
      {letters.map((letter, i) => (
        <span key={i} {...stylex.props(styles.letter, i === orpIndex && styles.orp)}>
          {letter}
        </span>
      ))}
    </div>
  );
};

export const RSVPReader = () => {
  const words = useMemo(() => RSVP_CONTENT.trim().split(/\s+/).filter(Boolean), []);
  const [state, setState] = useState<RSVPState>({
    status: "countdown",
    count: 3,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentIndex = getCurrentIndex(state, words.length);
  const currentWord = words[currentIndex] ?? "";
  const orpIndex = getORPIndex(currentWord);

  const isPlaying = state.status === "playing" || state.status === "countdown";
  const showWord =
    state.status === "playing" || state.status === "paused" || state.status === "finished";

  // Unified timer effect for countdown and word progression
  useEffect(() => {
    if (state.status === "countdown") {
      timeoutRef.current = setTimeout(() => {
        setState(
          state.count <= 1
            ? { status: "playing", wordIndex: 0 }
            : { status: "countdown", count: state.count - 1 },
        );
      }, 1000);
    } else if (state.status === "playing") {
      const word = words[state.wordIndex];
      if (!word) return;

      timeoutRef.current = setTimeout(() => {
        const nextIndex = state.wordIndex + 1;
        setState(
          nextIndex >= words.length
            ? { status: "finished" }
            : { status: "playing", wordIndex: nextIndex },
        );
      }, getWordDuration(word));
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [state, words]);

  const togglePlayPause = useCallback(() => {
    setState((prev) => {
      if (prev.status === "playing") {
        return { status: "paused", wordIndex: prev.wordIndex };
      }
      if (prev.status === "countdown") {
        return { status: "paused", wordIndex: 0 };
      }
      if (prev.status === "finished") {
        return { status: "playing", wordIndex: 0 };
      }
      // paused
      return { status: "playing", wordIndex: prev.wordIndex };
    });
  }, []);

  const goToPrevWord = useCallback(() => {
    setState((prev) => {
      const idx = getCurrentIndex(prev, words.length);
      return { status: "paused", wordIndex: Math.max(0, idx - 1) };
    });
  }, [words.length]);

  const goToNextWord = useCallback(() => {
    setState((prev) => {
      if (prev.status === "finished") {
        return { status: "paused", wordIndex: 0 };
      }
      const idx = getCurrentIndex(prev, words.length);
      const newIndex = Math.min(words.length - 1, idx + 1);
      return newIndex >= words.length - 1
        ? { status: "finished" }
        : { status: "paused", wordIndex: newIndex };
    });
  }, [words.length]);

  // Keyboard handler
  useEffect(() => {
    const handlers = new Map<string, () => void>([
      ["Space", togglePlayPause],
      ["ArrowLeft", goToPrevWord],
      ["ArrowRight", goToNextWord],
    ]);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const handler = handlers.get(e.code);
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, goToPrevWord, goToNextWord]);

  return (
    <main {...stylex.props(styles.main)}>
      <div {...stylex.props(styles.guide)} />

      <div {...stylex.props(styles.stage)}>
        <div {...stylex.props(styles.display)}>
          {showWord && currentWord && <WordDisplay word={currentWord} orpIndex={orpIndex} />}
        </div>
      </div>

      {state.status === "finished" ? (
        <a href="/" {...stylex.props(styles.controlButton)} aria-label="Go home">
          <HomeIcon />
        </a>
      ) : (
        <button
          onClick={togglePlayPause}
          {...stylex.props(styles.controlButton)}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {state.status === "countdown" ? (
            <span {...stylex.props(styles.mono)}>{state.count}</span>
          ) : isPlaying ? (
            <PauseIcon />
          ) : (
            <PlayIcon />
          )}
        </button>
      )}

      <div {...stylex.props(styles.hudLeft)}>
        <div {...stylex.props(styles.counterRow)}>
          <Counter text={state.status === "countdown" ? 0 : currentIndex + 1} />
          <span {...stylex.props(styles.tight)}>&nbsp;/&nbsp;{words.length}</span>
        </div>
        <div {...stylex.props(styles.track)}>
          <div
            {...stylex.props(styles.bar)}
            style={{
              width: `${state.status === "countdown" ? 0 : ((currentIndex + 1) / words.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div {...stylex.props(styles.hudRight)}>
        <div {...stylex.props(styles.keyRow)}>
          <span {...stylex.props(styles.keyGroup)}>
            <kbd {...stylex.props(styles.kbd, styles.kbdWide)}>space</kbd>
            <span>play/pause</span>
          </span>
          <span {...stylex.props(styles.keyGroupTight)}>
            <kbd {...stylex.props(styles.kbd, styles.kbdTight)}>
              <ChevronLeftIcon />
            </kbd>
            <kbd {...stylex.props(styles.kbd, styles.kbdTight)}>
              <ChevronRightIcon />
            </kbd>
            <span {...stylex.props(styles.ml1)}>prev/next</span>
          </span>
        </div>
      </div>
    </main>
  );
};
