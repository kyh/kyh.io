"use client";

import dynamic from "next/dynamic";

// The physics engine is a toy at the page's foot: loaded after the page is up,
// not shipped with it. The same box holds its place until it lands.
export const FigureCanvas = dynamic(
  async () => {
    const { FigurePhysics } = await import("./figure-physics");
    return FigurePhysics;
  },
  { loading: () => <div className="h-[480px] w-full" aria-hidden="true" />, ssr: false },
);
