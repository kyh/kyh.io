import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { colors } from "@repo/tailwind-compat/tokens.stylex";

import { KwadrantProvider, useKwadrant } from "@/lib/KwadrantContext";
import { KwadrantCanvas } from "./canvas/KwadrantCanvas";
import { FloatingIsland } from "./ui/FloatingIsland";

const styles = stylex.create({
  root: {
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
  },
  dark: { backgroundColor: colors.gray800 },
  light: { backgroundColor: colors.gray50 },
});

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
    <div ref={containerRef} {...stylex.props(styles.root, isDark ? styles.dark : styles.light)}>
      {size !== null && (
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
