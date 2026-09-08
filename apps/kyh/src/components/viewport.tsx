"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface ViewportContextType {
  width: number;
  height: number;
  isMobile: boolean;
}

const ViewportContext = createContext<ViewportContextType | null>(null);

const debounce = (fn: () => void, ms = 500) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(fn, ms);
  };
};

const isMobile = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/iu.test(navigator.userAgent);

interface ViewportProviderProps {
  children: React.ReactNode;
}

export const ViewportProvider = ({ children }: ViewportProviderProps) => {
  const [size, setSize] = useState(
    typeof window === "undefined"
      ? { height: 0, isMobile: true, width: 0 }
      : {
          height: window.innerHeight,
          isMobile: isMobile(),
          width: window.innerWidth,
        },
  );

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = document.documentElement.clientWidth;
      const windowHeight = document.documentElement.clientHeight;

      setSize((state) => ({
        ...state,
        height: windowHeight,
        width: windowWidth,
      }));
    };

    const debouncedHandleResize = debounce(handleResize);

    handleResize();
    window.addEventListener("resize", debouncedHandleResize);

    return () => {
      window.removeEventListener("resize", debouncedHandleResize);
    };
  }, []);

  return <ViewportContext.Provider value={size}>{children}</ViewportContext.Provider>;
};

export const useViewport = () => {
  const viewportContext = useContext(ViewportContext);

  if (!viewportContext) {
    throw new Error("viewportContext has to be used within <ViewportContext.Provider>");
  }

  return viewportContext;
};
