"use client";

import { useState, useEffect } from "react";

function getTimeUntilMidnightUTC(): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
    ),
  );
  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export const Countdown = () => {
  const [time, setTime] = useState(getTimeUntilMidnightUTC);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeUntilMidnightUTC());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center">
      <p className="text-muted-foreground text-sm">Next puzzle in</p>
      <p className="font-mono text-2xl font-bold tabular-nums">
        {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
      </p>
    </div>
  );
}
