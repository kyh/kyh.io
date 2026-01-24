"use client";

import { useEffect, useState } from "react";

import { Counter } from "@/components/counter";

const getPstTime = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    hour12: true,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
};

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
