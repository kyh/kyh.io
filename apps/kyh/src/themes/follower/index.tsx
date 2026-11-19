"use client";

import { useReducedMotion } from "motion/react";
import { Suspense, useEffect, useState } from "react";

import { lastPointer, subscribeToPointer } from "@/lib/pointer";
import { FOLLOWERS } from "../followers";
import { useTheme } from "../store";

const useMouseSeen = () => {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen) {
      return;
    }

    const check = () => {
      if (lastPointer()?.kind === "mouse") {
        setSeen(true);
      }
    };

    check();

    return subscribeToPointer(check);
  }, [seen]);

  return seen;
};

export const ThemeFollower = () => {
  const theme = useTheme();
  const still = useReducedMotion();
  const seen = useMouseSeen();
  const Follower = FOLLOWERS[theme];

  if (!Follower || still || !seen) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <Follower key={theme} />
    </Suspense>
  );
};
