import { useRef, useState, useEffect } from "react";
import type Konva from "konva";
import { KwadrantProvider, useKwadrant } from "@/lib/KwadrantContext";
import { KwadrantCanvas } from "./canvas/KwadrantCanvas";
import { FloatingIsland } from "./ui/FloatingIsland";

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
        setSize({ width: rect.width, height: rect.height });
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
    <div ref={containerRef} className={`h-screen w-screen overflow-hidden ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
      {size && (
        <>
          <KwadrantCanvas ref={stageRef} width={size.width} height={size.height} />
          <FloatingIsland stageRef={stageRef} canvasSize={size} />
        </>
      )}
    </div>
  );
};

export default function Index() {
  return (
    <KwadrantProvider>
      <KwadrantApp />
    </KwadrantProvider>
  );
}
