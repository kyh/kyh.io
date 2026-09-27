"use client";

import { useEffect, useState } from "react";

import { Counter } from "@/components/counter";

const getPstTime = () =>
  new Date().toLocaleString("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "numeric",
    second: "numeric",
    timeZone: "America/Los_Angeles",
  });

export const TimeCounter = () => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getPstTime());
    }, 1000);

    const timeout = setTimeout(() => {
      setTime(getPstTime());
    }, 500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="text-foreground-faded flex h-4 items-center text-xs">
      <Counter text={time} />
      {time && <span>&nbsp;&#183;&nbsp;SF</span>}
    </div>
  );
};
