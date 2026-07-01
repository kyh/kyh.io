import { useEffect, useState } from "react";

// Wall clock + uptime, ticking once a second.
export function useClock() {
  const [now, setNow] = useState(() => new Date());
  const [start] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return { now, uptime: now.getTime() - start };
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

// Braille spinner for the "system active" indicator.
export function useSpinner(intervalMs = 90) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return SPINNER_FRAMES[frame]!;
}

// Slow blink used for the cursor / live glyphs.
export function useBlink(intervalMs = 600) {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setOn((v) => !v), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return on;
}
