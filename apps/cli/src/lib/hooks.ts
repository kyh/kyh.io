import { useEffect, useState } from "react";

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
