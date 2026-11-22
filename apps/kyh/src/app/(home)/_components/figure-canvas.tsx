"use client";

import dynamic from "next/dynamic";

export const FigureCanvas = dynamic(
  async () => {
    const { FigurePhysics } = await import("./figure-physics");

    return FigurePhysics;
  },
  { loading: () => <div className="h-[480px] w-full" aria-hidden="true" />, ssr: false },
);
