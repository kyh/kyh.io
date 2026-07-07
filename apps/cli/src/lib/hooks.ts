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

// Elapsed-time driver for frame-based animations. Returns ms since mount,
// updated at roughly `fps`.
export function useTick(fps = 15) {
  const [elapsed, setElapsed] = useState(0);
  const [start] = useState(() => Date.now());
  // guard against 0/negative/huge fps collapsing to a 1ms rapid-fire timer
  const interval = Math.max(16, Math.round(1000 / Math.max(1, fps)));

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - start), interval);
    return () => clearInterval(id);
  }, [interval, start]);

  return elapsed;
}
