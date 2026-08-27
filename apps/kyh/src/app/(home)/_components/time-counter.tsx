"use client";

import { theme } from "../../../styles/tokens.stylex";

import { fontSizeLineHeights, fontSizes, spacing } from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import { useEffect, useState } from "react";

import { Counter } from "@/components/counter";

const styles = stylex.create({
  row: {
    color: theme.foregroundFaded,
    display: "flex",
    height: spacing[4],
    alignItems: "center",
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
  },
});

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
    <div {...stylex.props(styles.row)}>
      <Counter text={time} />
      {time && <span>&nbsp;&#183;&nbsp;SF</span>}
    </div>
  );
};
