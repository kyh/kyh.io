"use client";

import { useEffect, useState } from "react";

import { SocialLinks } from "@/components/social";
import { useViewport } from "@/components/viewport";
import { Counter } from "./counter";
import { percentY } from "./scene";

export const Footer = () => {
  const size = useViewport();
  const [top, setTop] = useState<string | number>("75vh");
  const [time, setTime] = useState("");

  useEffect(() => {
    setTop(percentY(80));
  }, [size.height]);

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
    <div
      className="absolute left-5 right-5 text-[color:var(--body-color)] flex items-center justify-between gap-3 text-[0.8rem]"
      style={{ top }}
    >
      <span className="flex items-center">
        <Counter text={time} />
        {time && <span>&nbsp;&#183;&nbsp;San Francisco, CA</span>}
      </span>
      {time && <SocialLinks className="animate-[animateIn_0.6s_cubic-bezier(0.23,1,0.32,1)]" />}
    </div>
  );
};

const getPstTime = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    hour12: true,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
};
