"use client";

import { isActive, statusOf } from "@repo/mod-clawders/run";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { demoAt, formatTokens } from "@/lib/demo";
import type { Line } from "@/lib/demo";
import { INSTALL_COMMAND } from "@/lib/site";

import { ClawdSprite } from "./clawd-sprite";
import { CopyCommand } from "./copy-command";

const TICK_MS = 100;
// With reduced motion the demo holds still on Claude mid-turn.
const STILL_SECONDS = 9;
// Claude Code's working glyph, frame by frame.
const SPINNER = ["·", "✢", "✳", "✶", "✻", "✽", "✻", "✶", "✳", "✢"];
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const subscribeMotion = (onChange: () => void) => {
  const query = matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const usePrefersReducedMotion = () =>
  useSyncExternalStore(
    subscribeMotion,
    () => matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

type World = Awaited<ReturnType<typeof loadWorld>>;

const loadWorld = async (host: HTMLElement) => {
  const { mountWorld } = await import("@repo/mod-clawders/world");
  return mountWorld(host);
};

const Prompt = ({ text }: { text: string }) => (
  <p className="t-prompt">
    <span className="t-caret">❯</span> {text}
  </p>
);

const TranscriptLine = ({ line }: { line: Line }) => {
  if (line.kind === "prompt") {
    return <Prompt text={line.text} />;
  }
  if (line.kind === "note") {
    return <p className="t-note">{line.text}</p>;
  }
  if (line.kind === "say") {
    return (
      <p className="t-say">
        <span className="t-dot">⏺</span> {line.text}
      </p>
    );
  }
  if (line.kind === "diff") {
    return (
      <div className="t-diff">
        <p className="t-removed">- {line.removed}</p>
        <p className="t-added">+ {line.added}</p>
      </div>
    );
  }
  return (
    <div className="t-tool">
      <p>
        <span className="t-dot t-ok">⏺</span> <b>{line.name}</b>({line.target})
      </p>
      <p className="t-result">⎿ {line.result}</p>
    </div>
  );
};

// The mod at work: a Claude Code session on the left, the Clawders pane on
// the right running the real game, both driven by one scripted loop.
export const Demo = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World | null>(null);
  const isStill = usePrefersReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const [coins, setCoins] = useState(0);
  const time = isStill ? STILL_SECONDS : elapsed;
  const state = demoAt(time);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    let isMounted = true;
    const mount = async () => {
      const world = await loadWorld(host);
      if (isMounted) {
        worldRef.current = world;
      } else {
        world.dispose();
      }
    };
    void mount();
    return () => {
      isMounted = false;
      worldRef.current?.dispose();
      worldRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isStill) {
      return;
    }
    const startedAt = performance.now();
    const timer = setInterval(() => {
      setElapsed((performance.now() - startedAt) / 1000);
      setCoins(worldRef.current?.coins() ?? 0);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [isStill]);

  useEffect(() => {
    const { run } = state;
    // An ended run keeps its score up, as the mod's HUD does.
    const tokens = run.kind === "idle" ? (run.last?.tokens ?? 0) : run.tokens;
    worldRef.current?.setRun({ isActive: !isStill && isActive(run), tokens });
  });

  const glyph = SPINNER[Math.floor(time * 6) % SPINNER.length];

  return (
    <section aria-label="Clawders running beside Claude Code" className="demo">
      <div className="terminal">
        <fieldset className="welcome">
          <legend>Clawders</legend>
          <ClawdSprite />
          <p>Keep Claude working. Every token Claude writes is a point.</p>
        </fieldset>

        <div className="session">
          <Prompt text="install it" />
          <CopyCommand command={INSTALL_COMMAND} />
          <p className="t-result">
            ⎿ Paste that into Claude Code. The pane opens on your next session.
          </p>
          <Prompt text="what does it need?" />
          <p className="t-say">
            <span className="t-dot">⏺</span> Google Chrome and Node.js. kitty or Ghostty draw the
            real picture; other terminals get blocks. Start with{" "}
            <code>CLAUDE_CODE_NO_FLICKER=1</code> so the pane docks on the right.
          </p>
          <Prompt text="how do I score?" />
          <p className="t-say">
            <span className="t-dot">⏺</span> Every output token is a point. When Claude finishes,
            send the next prompt within 5 seconds or the run ends and goes on the leaderboard below.
          </p>
        </div>

        <div aria-hidden="true" className="live">
          <div className="transcript">
            {state.lines.map((line, index) => (
              <TranscriptLine key={index} line={line} />
            ))}
          </div>
          <p className="t-spinner">
            {state.spinner ? (
              <>
                <span className="t-glyph">{glyph}</span>{" "}
                <span className="t-verb">{state.spinner.verb}…</span>{" "}
                <span className="t-dim">
                  ({state.spinner.seconds}s · ↓ {formatTokens(state.spinner.tokens)} tokens · esc to
                  interrupt)
                </span>
              </>
            ) : (
              " "
            )}
          </p>
          <div className="input">
            <span className="t-caret">❯</span> {state.input}
            <span className="caret" />
          </div>
          <p className="t-hints">
            <span className="t-clay">⏵⏵ auto mode on</span> (shift+tab to cycle) · esc to interrupt
          </p>
        </div>
      </div>

      <div className="pane">
        <div className="pane-bar">
          <span>Clawders</span>
          <span aria-hidden="true">×</span>
        </div>
        <div className="pane-screen" ref={hostRef} />
        <p aria-live="off" className="pane-status">
          {statusOf(state.run, coins)}
        </p>
      </div>
    </section>
  );
};
