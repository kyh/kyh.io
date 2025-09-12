"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ViewportContextType = {
  width: number;
  height: number;
  isMobile: boolean;
};

const ViewportContext = createContext<ViewportContextType | null>(null);

type ViewportProviderProps = {
  children: React.ReactNode;
};

export const ViewportProvider = ({ children }: ViewportProviderProps) => {
  const [size, setSize] = useState(
    typeof window !== "undefined"
      ? {
          width: window.innerWidth,
          height: window.innerHeight,
          isMobile: isMobile(),
        }
      : { width: 0, height: 0, isMobile: true },
  );

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = document.documentElement.clientWidth;
      const windowHeight = document.documentElement.clientHeight;

      setSize((state) => ({
        ...state,
        width: windowWidth,
        height: windowHeight,
      }));
    };

    const debouncedHandleResize = debounce(handleResize);

    handleResize();
    window.addEventListener("resize", debouncedHandleResize);

    return () => {
      window.removeEventListener("resize", debouncedHandleResize);
    };
  }, []);

  return (
    <ViewportContext.Provider value={size}>{children}</ViewportContext.Provider>
  );
};

export const useViewport = () => {
  const viewportContext = useContext(ViewportContext);

  if (!viewportContext) {
    throw new Error(
      "viewportContext has to be used within <ViewportContext.Provider>",
    );
  }

  return viewportContext;
};

const debounce = (fn: Function, ms = 500) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

const isMobile = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
