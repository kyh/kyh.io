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
    let cleanup: (() => void) | undefined;

    if (!seen) {
      const check = () => {
        if (lastPointer()) {
          setSeen(true);
        }
      };

      check();

      cleanup = subscribeToPointer(check);
    }

    return cleanup;
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
