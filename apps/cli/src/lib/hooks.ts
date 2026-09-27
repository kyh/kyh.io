import { useEffect, useRef, useState } from "react";

// Wall clock + uptime, ticking once a second.
export const useClock = () => {
  const [now, setNow] = useState(() => new Date());
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setNow(new Date());
      setUptime(Date.now() - start);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return { now, uptime };
};

// Elapsed-time driver for frame-based animations. Returns ms since mount,
// updated at roughly `fps`.
export const useTick = (fps = 15) => {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  // guard against 0/negative/huge fps collapsing to a 1ms rapid-fire timer
  const interval = Math.max(16, Math.round(1000 / Math.max(1, fps)));

  useEffect(() => {
    // the origin survives `fps` changes so elapsed never jumps backwards
    const start = startRef.current ?? Date.now();
    startRef.current = start;
    const id = setInterval(() => setElapsed(Date.now() - start), interval);
    return () => clearInterval(id);
  }, [interval]);

  return elapsed;
};
