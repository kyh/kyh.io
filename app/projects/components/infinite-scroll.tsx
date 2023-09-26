"use client";

import Lenis from "@studio-freight/lenis";
import { useEffect } from "react";

type InfiniteScrollProps = {
  children: React.ReactNode;
};

export const InfiniteScroll = ({ children }: InfiniteScrollProps) => {
  useEffect(() => {
    const lenis = new Lenis({
      infinite: true,
    });

    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };

    requestAnimationFrame(raf);

    return () => {
      lenis.stop();
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
};
