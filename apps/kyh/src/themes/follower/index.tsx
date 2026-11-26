"use client";

import { useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { lastPointer, subscribeToPointer } from "@/lib/pointer";
import { FOLLOWERS } from "../followers";
import { useTheme } from "../store";

const usePointerSeen = () => {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen) {
      return;
    }

    const check = () => {
      if (lastPointer()) {
        setSeen(true);
      }
    };

    check();

    return subscribeToPointer(check);
  }, [seen]);

  return seen;
};

const useBeenHome = () => {
  const home = usePathname() === "/";
  const [been, setBeen] = useState(home);

  if (home && !been) {
    setBeen(true);
  }

  return been;
};

export const ThemeFollower = () => {
  const theme = useTheme();
  const still = useReducedMotion();
  const seen = usePointerSeen();
  const beenHome = useBeenHome();
  const Follower = FOLLOWERS[theme];

  if (!Follower || still === true || !seen || !beenHome) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <Follower key={theme} />
    </Suspense>
  );
};
