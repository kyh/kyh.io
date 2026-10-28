"use client";

// The theme's hat (`hats.ts`), worn tilted on the logo's top-right corner as
// the blimp wears its own: a witch's at Halloween, Santa's at Christmas. The
// logo's wrapper is its frame (relative), so the hat sits wherever it does.
import { PieceIcon } from "./piece";
import { themeOf } from "./index";
import { useTheme } from "./store";

export const ThemeHat = () => {
  const { hat } = themeOf(useTheme());
  if (hat === null) {
    return null;
  }
  return (
    <PieceIcon
      art={hat}
      className="pointer-events-none absolute -top-[14px] -right-[11px] size-[28px] rotate-[24deg]"
    />
  );
};
