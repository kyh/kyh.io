"use client";

import type {
  MotionStyle,
  MotionValue,
  ValueAnimationTransition,
} from "motion/react";
import * as React from "react";
import Image from "next/image";
import { useScroll, useWheel } from "@use-gesture/react";
import {
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

import type { Item, Lines, LineType } from "./data";
import { DATA } from "./data";
import styles from "./radial-timeline.module.css";
import {
  areIntersecting,
  clamp,
  useEvent,
  useIsHydrated,
  useShortcuts,
} from "./utils";

export const SCALE_ZOOM = 6;
export const SCALE_DEFAULT = 1;
export const SCALE_ZOOM_FACTOR = 0.02;
export const SCROLL_SNAP = 250;

////////////////////////////////////////////////////////////////////////////////

type Constants = {
  LINE_WIDTH_SMALL: number;
  LINE_WIDTH_MEDIUM: number;
  LINE_WIDTH_LARGE: number;
  LABEL_FONT_SIZE: number;
  LABEL_MARGIN: number;
  RADIUS: number;
  SIZE: number;
};

export type TimelineContext = {
  zoom: boolean;
  rotate: MotionValue<number>;
  rotateToIndex: (index: number) => void;
  setHoveredIndex: React.Dispatch<React.SetStateAction<number | null>>;
  hoveredIndex: number | null;
  activeIndex: number | null;
} & Constants;

const TimelineContext = React.createContext({} as TimelineContext);
export const useTimeline = () => React.useContext(TimelineContext);

////////////////////////////////////////////////////////////////////////////////

export const RadialTimeline = () => {
  useShortcuts({
    Escape: () => {
      if (!zoom) rotate.set(0);
      setZoom(false);
      activeNode.current?.blur();
      animate(scrollY, 0, transition);
      scale.set(SCALE_DEFAULT);
      setActiveIndex(null);
    },
    ArrowLeft: arrow(-1),
    ArrowRight: arrow(1),
  });

  const ref = React.useRef<HTMLDivElement>(null);
  const isHydrated = useIsHydrated();
  const scrollY = useMotionValue(0);
  const sheetRef = React.useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = React.useState(false);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const activeNode = React.useRef<HTMLElement>(null);

  const intersectingAtY = useMotionValue(0);
  const rotate = useSpring(0, { stiffness: 150, damping: 42, mass: 1.1 });
  const scale = useSpring(1, { stiffness: 300, damping: 50 });

  const [lines, constants] = useLines();

  const context = {
    ...constants,
    rotateToIndex,
    setHoveredIndex,
    hoveredIndex,
    activeIndex,
    zoom,
    rotate,
  };

  function arrow(dir: 1 | -1) {
    return () => {
      if (activeIndex !== null) {
        const newIndex = activeIndex + dir;
        if (newIndex >= 0 && newIndex < DATA.length) {
          rotateToIndex(newIndex);
        }
      }
    };
  }

  React.useEffect(() => {
    function wheel(e: WheelEvent) {
      // Prevent back swipe on horizontal wheel
      if (Math.abs(e.deltaX) > 0) {
        e.preventDefault();
      }
    }

    window.addEventListener("wheel", wheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", wheel);
    };
  }, []);

  useWheel(
    ({ delta: [dx, dy], last }) => {
      if (Math.abs(dy) > 0) return;
      if (!zoom) return;
      const newRotate = rotate.get() + dx * -1 * 0.5;
      rotate.set(newRotate);
      const newIndex = getIndexForRotate(newRotate);
      if (last && newIndex !== activeIndex) {
        rotateToIndex(newIndex);
      }
    },
    {
      target: typeof window !== "undefined" ? window : undefined,
    },
  );

  useScroll(
    ({ delta: [_, dy], offset: [__, oy] }) => {
      scrollY.stop();
      scrollY.set(-oy);

      if (sheetRef.current && activeNode.current) {
        const intersecting = areIntersecting(
          sheetRef.current,
          activeNode.current,
        );
        if (intersecting && intersectingAtY.get() === 0) {
          intersectingAtY.set(oy);
        }
      }

      if (oy <= 0) {
        // Zoom out
        scale.set(SCALE_DEFAULT);
        setZoom(false);
        intersectingAtY.set(0);
        setActiveIndex(null);
        setHoveredIndex(null);
        return;
      }

      if (oy >= SCROLL_SNAP) {
        // Zoom in
        scale.set(SCALE_ZOOM);
        if (activeIndex === null) {
          const index = getIndexForRotate(rotate.get());
          rotateToIndex(index);
        }
        setZoom(true);
        return;
      }

      let newScale = scale.get() + dy * SCALE_ZOOM_FACTOR;
      newScale = clamp(newScale, [1, SCALE_ZOOM]);
      scale.set(newScale);
    },
    {
      target: typeof window !== "undefined" ? window : undefined,
    },
  );

  React.useEffect(() => {
    window.history.scrollRestoration = "manual";
    document.documentElement.scrollTo(0, 0);
  }, []);

  React.useEffect(() => {
    const activeElement = document.querySelector("[data-active=true]");
    if (activeElement) {
      activeNode.current = activeElement as HTMLElement;
    }
  }, [activeIndex]);

  useEvent("resize", () => {
    intersectingAtY.set(0);
  });

  function rotateToIndex(targetIndex: number | null) {
    if (targetIndex === null) return;
    setZoom(true);
    setActiveIndex(targetIndex);

    if (zoom) {
      document.documentElement.scrollTo({
        top: SCROLL_SNAP,
        left: 0,
        behavior: "smooth",
      });
    } else {
      document.documentElement.scrollTop = SCROLL_SNAP;
    }

    const newRotate = getRotateForIndex(targetIndex, rotate.get());

    if (newRotate === rotate.get()) {
      return;
    }

    rotate.set(newRotate);
  }

  return (
    <Provider value={context}>
      <div className={styles.fixedContainer}>
        <motion.div
          className={styles.absoluteContainer}
          style={{
            width: constants.SIZE,
            height: constants.SIZE,
            scale,
            filter: useTransform(scrollY, (y) => {
              if (intersectingAtY.get() === 0) return "blur(0px)";
              const offsetY = Math.abs(y) - intersectingAtY.get();
              const blur = clamp(offsetY * 0.005, [0, 4]);
              return `blur(${blur}px)`;
            }),
          }}
        >
          {/* Rotate */}
          {isHydrated && (
            <motion.div
              ref={ref}
              className={styles.fullSize}
              style={{ rotate }}
              transition={transition}
            >
              {lines.map((line, index) => {
                return <Line key={index} {...line} />;
              })}
            </motion.div>
          )}
        </motion.div>
      </div>
      <Sheet ref={sheetRef} />
    </Provider>
  );
};

////////////////////////////////////////////////////////////////////////////////

export const Provider = ({
  value,
  children,
}: {
  value: TimelineContext;
  children: React.ReactNode;
}) => {
  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
};

////////////////////////////////////////////////////////////////////////////////

export const Line = ({
  dataIndex,
  variant,
  rotation,
  offsetX,
  offsetY,
}: LineType) => {
  const {
    zoom,
    hoveredIndex,
    activeIndex,
    rotateToIndex,
    setHoveredIndex,
    LINE_WIDTH_LARGE,
    LINE_WIDTH_SMALL,
    LINE_WIDTH_MEDIUM,
    LABEL_FONT_SIZE,
    LABEL_MARGIN,
    RADIUS,
  } = useTimeline();

  const isInteractive = dataIndex !== null;
  const currentItem = isInteractive ? DATA[dataIndex] : null;
  const hoveredItem = hoveredIndex ? DATA[hoveredIndex] : null;

  const hovered = dataIndex === hoveredIndex && dataIndex !== null;
  const active = activeIndex === dataIndex && dataIndex !== null;

  let width = LINE_WIDTH_SMALL;
  if (variant === "medium") width = LINE_WIDTH_MEDIUM;
  if (variant === "large" || hovered || active) width = LINE_WIDTH_LARGE;

  const props = {
    ...(isInteractive && {
      onClick: () => rotateToIndex(dataIndex),
      onMouseEnter: () => setHoveredIndex(dataIndex),
      onMouseLeave: () => setHoveredIndex(null),
    }),
  };

  const Root = isInteractive ? motion.button : motion.div;

  return (
    <Root
      {...props}
      className={styles.line}
      data-variant={variant}
      data-active={active}
      data-hovered={hovered || active}
      style={{
        rotate: rotation,
        x: RADIUS + offsetX + LINE_WIDTH_LARGE,
        y: RADIUS + offsetY + LINE_WIDTH_LARGE,
        width,
      }}
      initial={false}
      animate={{
        width,
        transition: {
          ...transition,
          width: {
            type: "spring",
            stiffness: 250,
            damping: 25,
          },
        },
        scale: zoom ? 0.2 : 1,
      }}
    >
      {/* Forces Safari to render with GPU */}
      <div aria-hidden style={{ transform: "translateZ(0)" }} />
      {currentItem?.name && (
        <Meta
          currentItem={currentItem}
          hoveredItem={hoveredItem || null}
          hovered={hovered}
          zoom={zoom}
          rotation={rotation}
          style={{
            fontSize: LABEL_FONT_SIZE,
            x: LABEL_MARGIN,
          }}
        />
      )}
    </Root>
  );
};

////////////////////////////////////////////////////////////////////////////////

export const Meta = ({
  currentItem,
  hoveredItem,
  hovered,
  zoom,
  style,
  rotation,
}: {
  currentItem: Item;
  hoveredItem: Item | null;
  hovered?: boolean;
  zoom?: boolean;
  style: MotionStyle;
  rotation: number;
}) => {
  const { rotate } = useTimeline();
  const reverseRotate = useTransform(rotate, (r) => -r - rotation);
  const isPartiallyVisible = hoveredItem && hoveredItem.variant === "medium";

  let opacity = 0;

  if (currentItem.variant === "large") {
    opacity = isPartiallyVisible ? 0.2 : 1;
  }

  if (hovered || zoom) {
    opacity = 1;
  }

  return (
    <motion.div
      className={styles.meta}
      data-slot="meta"
      style={{ ...style, rotate: reverseRotate }}
      initial={{ opacity }}
      animate={{ opacity }}
      transition={{
        opacity: { delay: zoom && !isPartiallyVisible ? 0.4 : 0 },
        ...transition,
      }}
    >
      <span data-slot="label">{currentItem.name}</span>
    </motion.div>
  );
};

////////////////////////////////////////////////////////////////////////////////

export const Sheet = ({
  children,
  ref,
}: {
  ref: React.Ref<HTMLDivElement>;
  children?: React.ReactNode;
}) => {
  const { zoom, activeIndex } = useTimeline();
  const [item, setItem] = React.useState<Item | null>(null);

  React.useEffect(() => {
    if (activeIndex === null) return;
    const item = DATA[activeIndex];
    if (item) {
      setItem(item);
    }
  }, [activeIndex]);

  return (
    <motion.div
      ref={ref}
      className={styles.sheet}
      initial={false}
      style={{
        pointerEvents: zoom ? "auto" : "none",
      }}
      animate={{
        filter: zoom ? "blur(0px)" : "blur(20px)",
        opacity: zoom ? 1 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: zoom ? 150 : 300,
        damping: 25,
        delay: zoom ? 0.4 : 0,
      }}
      onAnimationComplete={() => {
        if (!zoom) {
          document.documentElement.scrollTop = 0;
        }
      }}
    >
      {children ?? (
        <div className={styles.content}>
          <i className={styles.title}>{item?.title}</i>
          {item?.description && (
            <p className={styles.description}>{item.description}</p>
          )}
        </div>
      )}
    </motion.div>
  );
};

export function getLines(rootScale: number): [Lines, Constants] {
  const LINE_WIDTH_SMALL = 40 * rootScale;
  const LINE_WIDTH_MEDIUM = 45 * rootScale;
  const LINE_WIDTH_LARGE = 72 * rootScale;
  const LABEL_FONT_SIZE = 16 * rootScale;
  const LABEL_MARGIN = 80 * rootScale;
  const RADIUS = 280 * rootScale;
  const SIZE = RADIUS * 2 + LINE_WIDTH_LARGE * 2;

  // Calculate total lines: projects + asset lines
  const PROJECT_COUNT = DATA.length;
  const totalAssetLines = DATA.reduce(
    (sum, item) => sum + item.projectAssets.length,
    0,
  );
  const TOTAL_LINES = PROJECT_COUNT + totalAssetLines;
  const ANGLE_INCREMENT = 360 / TOTAL_LINES;

  const lines: Lines = [];
  let lineIndex = 0;

  DATA.forEach((item, projectIndex) => {
    // Add the project line
    const projectRotation = lineIndex * ANGLE_INCREMENT;
    const projectAngleRad = (projectRotation * Math.PI) / 180;
    const projectOffsetX = RADIUS * Math.cos(projectAngleRad);
    const projectOffsetY = RADIUS * Math.sin(projectAngleRad);

    lines.push({
      rotation: projectRotation,
      offsetX: projectOffsetX,
      offsetY: projectOffsetY,
      dataIndex: projectIndex,
      variant: item.variant,
    });

    lineIndex++;

    // Add asset lines after this project
    for (
      let assetIndex = 0;
      assetIndex < item.projectAssets.length;
      assetIndex++
    ) {
      const assetRotation = lineIndex * ANGLE_INCREMENT;
      const assetAngleRad = (assetRotation * Math.PI) / 180;
      const assetOffsetX = RADIUS * Math.cos(assetAngleRad);
      const assetOffsetY = RADIUS * Math.sin(assetAngleRad);

      lines.push({
        rotation: assetRotation,
        offsetX: assetOffsetX,
        offsetY: assetOffsetY,
        dataIndex: null, // Asset lines don't have a data index
        variant: "small" as const,
      });

      lineIndex++;
    }
  });

  return [
    lines,
    {
      LINE_WIDTH_SMALL,
      LINE_WIDTH_MEDIUM,
      LINE_WIDTH_LARGE,
      LABEL_FONT_SIZE,
      LABEL_MARGIN,
      RADIUS,
      SIZE,
    },
  ];
}

export function useLines(): [Lines, Constants] {
  const [rootScale, setRootScale] = React.useState(1);

  useEvent("resize", () => {
    const widthScale = window.innerWidth / 960;
    const heightScale = window.innerHeight / 640;
    const newScale = clamp(Math.min(widthScale, heightScale), [0.4, 1]);
    setRootScale(newScale);
  });

  const [lines, constants] = React.useMemo(
    () => getLines(rootScale),
    [rootScale],
  );

  return [lines, constants];
}

////////////////////////////////////////////////////////////////////////////////

export function getRotateForIndex(index: number, rotate: number) {
  const item = DATA[index];
  if (!item) return rotate;

  // Calculate the position of this project in the line array
  let projectLineIndex = 0;
  for (let i = 0; i < index; i++) {
    const project = DATA[i];
    if (project) {
      projectLineIndex += 1 + project.projectAssets.length; // Project line + asset lines
    }
  }

  const totalAssetLines = DATA.reduce(
    (sum, item) => sum + item.projectAssets.length,
    0,
  );
  const TOTAL_LINES = DATA.length + totalAssetLines;
  const ANGLE_INCREMENT = 360 / TOTAL_LINES;

  // Calculate the target rotation for this project
  const targetRotation = projectLineIndex * ANGLE_INCREMENT;

  // To center the project at the top (12 o'clock), we need to rotate the circle
  // so that the project's angle becomes -90 degrees (since 0 is at 3 o'clock)
  const newRotate = -targetRotation - 90;

  return newRotate;
}

export function getIndexForRotate(rotate: number) {
  const totalAssetLines = DATA.reduce(
    (sum, item) => sum + item.projectAssets.length,
    0,
  );
  const TOTAL_LINES = DATA.length + totalAssetLines;
  const ANGLE_INCREMENT = 360 / TOTAL_LINES;

  // Find which project is closest to the center (top) based on current rotation
  const sortedByDelta = DATA.map((item, index) => {
    // Calculate the position of this project in the line array
    let projectLineIndex = 0;
    for (let i = 0; i < index; i++) {
      const project = DATA[i];
      if (project) {
        projectLineIndex += 1 + project.projectAssets.length; // Project line + asset lines
      }
    }

    const targetRotation = projectLineIndex * ANGLE_INCREMENT;
    const projectAngle = targetRotation + rotate; // Current angle of the project
    const normalizedAngle = ((projectAngle % 360) + 360) % 360; // Normalize to 0-360

    // Calculate distance from top center (-90 degrees in this coordinate system)
    const topCenterAngle = 270; // -90 degrees normalized to 0-360
    const delta = Math.min(
      Math.abs(normalizedAngle - topCenterAngle),
      Math.abs(normalizedAngle - topCenterAngle + 360),
      Math.abs(normalizedAngle - topCenterAngle - 360),
    );

    return {
      index,
      delta,
    };
  }).sort((a, b) => a.delta - b.delta);

  const closest = sortedByDelta[0];

  if (!closest) {
    return null;
  }

  return closest.index;
}

export const transition: ValueAnimationTransition<number> = {
  type: "spring",
  stiffness: 100,
  damping: 22,
  mass: 1.3,
};
