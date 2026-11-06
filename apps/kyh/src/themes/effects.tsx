"use client";

// What a theme puts on the page round everything else: what falls across it
// (`drift.tsx`) and what hangs in its corners (`corners.tsx`). Each is its
// own chunk, loaded only once the theme that's on has it in its dress
// (`dresses.ts`): most days, and most themes, load neither.
import { lazy, Suspense } from "react";

import { useDress } from "./dresses";
import { useTheme } from "./store";

const Drifting = lazy(async () => {
  const { Drifting: loaded } = await import("./drift");
  return { default: loaded };
});

const Hanging = lazy(async () => {
  const { Hanging: loaded } = await import("./corners");
  return { default: loaded };
});

export const ThemeDrift = () => {
  const drift = useDress(useTheme())?.drift ?? null;
  return drift === null ? null : (
    <Suspense fallback={null}>
      <Drifting drift={drift} />
    </Suspense>
  );
};

export const ThemeCorners = () => {
  const corners = useDress(useTheme())?.corners ?? null;
  return corners === null ? null : (
    <Suspense fallback={null}>
      <Hanging corners={corners} />
    </Suspense>
  );
};
