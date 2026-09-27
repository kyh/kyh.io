import type Konva from "konva";
import { useEffect, useRef, useState } from "react";

import { KwadrantProvider, useKwadrant } from "@/lib/kwadrant-context";
import { KwadrantCanvas } from "./canvas/kwadrant-canvas";
import { FloatingIsland } from "./ui/floating-island";
import { cn } from "cn";

const KwadrantApp = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const { state } = useKwadrant();
  const isDark = state.theme === "dark";

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSize({ height: rect.height, width: rect.width });
      }
    };

    requestAnimationFrame(updateSize);

    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("h-screen w-screen overflow-hidden", isDark ? "bg-gray-800" : "bg-gray-50")}
    >
      {size !== null && (
        <>
          <KwadrantCanvas ref={stageRef} width={size.width} height={size.height} />
          <FloatingIsland stageRef={stageRef} canvasSize={size} />
        </>
      )}
    </div>
  );
};

const Index = () => (
  <KwadrantProvider>
    <KwadrantApp />
  </KwadrantProvider>
);

export default Index;
