"use client";

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
  const { baseTime, timePerChar, punctuationMultiplier, commaMultiplier } =
    RSVP_SETTINGS;
  const duration = baseTime + word.length * timePerChar;
  const lastChar = word.slice(-1);
  if (/[.!?]/.test(lastChar)) return duration * punctuationMultiplier;
  if (lastChar === ",") return duration * commaMultiplier;
  return duration;
};

const getCurrentIndex = (state: RSVPState, totalWords: number): number => {
  if (state.status === "playing" || state.status === "paused")
    return state.wordIndex;
  if (state.status === "finished") return totalWords - 1;
  return 0;
};

// Word display component
const WordDisplay = ({
  word,
  orpIndex,
}: {
  word: string;
  orpIndex: number;
}) => {
  const letters = word.split("");
  const offset = (orpIndex + 0.5 - letters.length / 2) * 0.6;

  return (
    <div
      className="flex items-center"
      style={{ transform: `translateX(${-offset}em)` }}
    >
      {letters.map((letter, i) => (
        <span
          key={i}
          className={`inline-block w-[0.6em] text-center ${
            i === orpIndex ? "text-red-500" : ""
          }`}
        >
          {letter}
        </span>
      ))}
    </div>
  );
};

export const RSVPReader = () => {
  const words = useMemo(
    () => RSVP_CONTENT.trim().split(/\s+/).filter(Boolean),
    [],
  );
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
    state.status === "playing" ||
    state.status === "paused" ||
    state.status === "finished";

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
    const handlers: Record<string, () => void> = {
      Space: togglePlayPause,
      ArrowLeft: goToPrevWord,
      ArrowRight: goToNextWord,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const handler = handlers[e.code];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, goToPrevWord, goToNextWord]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <div className="bg-foreground-faded/30 absolute top-0 left-1/2 h-full w-px -translate-x-1/2" />

      <div className="relative flex h-32 w-full max-w-2xl items-center justify-center">
        <div className="font-mono text-5xl font-normal tracking-tight md:text-6xl">
          {showWord && currentWord && (
            <WordDisplay word={currentWord} orpIndex={orpIndex} />
          )}
        </div>
      </div>

      {state.status === "finished" ? (
        <a
          href="/"
          className="border-border bg-background hover:bg-background-faded relative flex size-12 items-center justify-center rounded-full border transition-colors"
          aria-label="Go home"
        >
          <HomeIcon />
        </a>
      ) : (
        <button
          onClick={togglePlayPause}
          className="border-border bg-background hover:bg-background-faded relative flex size-12 items-center justify-center rounded-full border transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {state.status === "countdown" ? (
            <span className="font-mono text-lg">{state.count}</span>
          ) : isPlaying ? (
            <PauseIcon />
          ) : (
            <PlayIcon />
          )}
        </button>
      )}

      <div className="text-foreground-faded fixed bottom-[6dvh] left-12 hidden text-xs sm:block">
        <div className="mb-2 flex items-center tabular-nums">
          <Counter text={state.status === "countdown" ? 0 : currentIndex + 1} />
          <span className="leading-none">&nbsp;/&nbsp;{words.length}</span>
        </div>
        <div className="bg-border h-1 w-32 overflow-hidden rounded-full">
          <div
            className="bg-foreground-faded h-full transition-all duration-150"
            style={{
              width: `${state.status === "countdown" ? 0 : ((currentIndex + 1) / words.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="text-foreground-faded fixed right-12 bottom-[6dvh] hidden text-xs sm:block">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="border-border bg-background-faded inline-flex items-center justify-center rounded border px-1.5 py-0.5">
              space
            </kbd>
            <span>play/pause</span>
          </span>
          <span className="flex items-center gap-0.5">
            <kbd className="border-border bg-background-faded inline-flex items-center justify-center rounded border p-1">
              <ChevronLeftIcon />
            </kbd>
            <kbd className="border-border bg-background-faded inline-flex items-center justify-center rounded border p-1">
              <ChevronRightIcon />
            </kbd>
            <span className="ml-1">prev/next</span>
          </span>
        </div>
      </div>
    </main>
  );
};
