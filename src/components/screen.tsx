"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ScreenContextType = {
  width: number;
  height: number;
};

const ScreenContext = createContext<ScreenContextType | null>(null);

type ScreenProviderProps = {
  children: React.ReactNode;
};

export const ScreenProvider = ({ children }: ScreenProviderProps) => {
  const [size, setSize] = useState(
    typeof window !== "undefined"
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 }
  );

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = document.documentElement.clientWidth;
      const windowHeight = document.documentElement.clientHeight;

      document.documentElement.style.setProperty(
        "--h-screen",
        `${windowHeight}px`
      );

      setSize({ width: windowWidth, height: windowHeight });
    };
    const debouncedHandleResize = debounce(handleResize);

    window.addEventListener("resize", debouncedHandleResize);

    return () => {
      window.removeEventListener("resize", debouncedHandleResize);
    };
  }, []);

  return (
    <ScreenContext.Provider value={size}>{children}</ScreenContext.Provider>
  );
};

export const useScreenSize = () => {
  const screenContext = useContext(ScreenContext);

  if (!screenContext) {
    throw new Error(
      "screenContext has to be used within <ScreenContext.Provider>"
    );
  }

  return screenContext;
};

const debounce = (fn: Function, ms = 500) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};
