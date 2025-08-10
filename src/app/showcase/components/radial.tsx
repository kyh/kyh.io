"use client";

import type {
  MotionStyle,
  MotionValue,
  ValueAnimationTransition,
} from "motion/react";
import type { Dispatch, ReactNode, Ref, SetStateAction } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useScroll } from "@use-gesture/react";
import {
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

import type { LineType, LineTypes, ProjectType, RadialDataType } from "./data";
import { AnimateSection, ScrambleText } from "@/components/animate-text";
import { Card } from "@/components/card";
import { Link } from "@/components/link";
import { radialData } from "./data";
import styles from "./radial.module.css";
import {
  areIntersecting,
  clamp,
  useEvent,
  useHashState,
  useIsHydrated,
  useShortcuts,
} from "./utils";

const SCALE_ZOOM = 6;
const SCALE_DEFAULT = 1;
const SCALE_ZOOM_FACTOR = 0.02;
const SCROLL_SNAP = 250;

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
  hoveredIndex: number | null;
  setHoveredIndex: Dispatch<SetStateAction<number | null>>;
  activeIndex: number | null;
  setActiveIndex: (index: number | null) => void;
} & Constants;

const TimelineContext = createContext({} as TimelineContext);
const useTimeline = () => useContext(TimelineContext);

export const Radial = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isHydrated = useIsHydrated();
  const scrollY = useMotionValue(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(false);
  const [activeIndex, setActiveIndex] = useHashState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activeNode = useRef<HTMLElement>(null);

  const intersectingAtY = useMotionValue(0);
  const rotate = useSpring(0, { stiffness: 150, damping: 42, mass: 1.1 });
  const scale = useSpring(1, { stiffness: 300, damping: 50 });

  const [lines, constants] = useLines();

  useShortcuts({
    Escape: () => {
      if (!zoom) rotate.set(0);
      activeNode.current?.blur();
      animate(scrollY, 0, transition);
      scale.set(SCALE_DEFAULT);
      setActiveIndex(null);
    },
    ArrowLeft: () => {
      if (activeIndex !== null) {
        const len = radialData.length;
        const newIndex = (activeIndex + -1 + len) % len;
        setActiveIndex(newIndex);
      }
    },
    ArrowRight: () => {
      if (activeIndex !== null) {
        const len = radialData.length;
        const newIndex = (activeIndex + 1 + len) % len;
        setActiveIndex(newIndex);
      }
    },
  });

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
        intersectingAtY.set(0);
        setActiveIndex(null);
        return;
      }

      if (oy >= SCROLL_SNAP) {
        // Zoom in
        scale.set(SCALE_ZOOM);
        if (activeIndex === null) {
          const index = getIndexForRotate(rotate.get());
          setActiveIndex(index);
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

  useEffect(() => {
    window.history.scrollRestoration = "manual";
    document.documentElement.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    function rotateToIndex(targetIndex: number | null) {
      if (targetIndex === null) {
        setZoom(false);
        setActiveIndex(null);
        setHoveredIndex(null);
        return;
      }

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
      if (newRotate === rotate.get()) return;
      rotate.set(newRotate);
    }

    const activeElement = document.querySelector("[data-active=true]");
    if (activeElement) {
      activeNode.current = activeElement as HTMLElement;
    }
    rotateToIndex(activeIndex);
  }, [activeIndex, rotate, zoom, setActiveIndex]);

  useEvent("resize", () => {
    intersectingAtY.set(0);
  });

  return (
    <Provider
      value={{
        ...constants,
        hoveredIndex,
        setHoveredIndex,
        activeIndex,
        setActiveIndex,
        zoom,
        rotate,
      }}
    >
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
              const blur = clamp(offsetY * 0.005, [1, 4]);
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

const Provider = ({
  value,
  children,
}: {
  value: TimelineContext;
  children: ReactNode;
}) => {
  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
};

const Line = ({ dataIndex, variant, rotation, offsetX, offsetY }: LineType) => {
  const {
    zoom,
    hoveredIndex,
    activeIndex,
    setActiveIndex,
    setHoveredIndex,
    LINE_WIDTH_LARGE,
    LINE_WIDTH_SMALL,
    LINE_WIDTH_MEDIUM,
    LABEL_FONT_SIZE,
    LABEL_MARGIN,
    RADIUS,
  } = useTimeline();

  const isInteractive = dataIndex !== null;
  const currentItem = isInteractive ? radialData[dataIndex] : null;
  const hoveredItem = hoveredIndex ? radialData[hoveredIndex] : null;

  const hovered = dataIndex === hoveredIndex && dataIndex !== null;
  const active = activeIndex === dataIndex && dataIndex !== null;

  let width = LINE_WIDTH_SMALL;
  if (variant === "medium") width = LINE_WIDTH_MEDIUM;
  if (variant === "large" || hovered || active) width = LINE_WIDTH_LARGE;

  const props = {
    ...(isInteractive && {
      onClick: () => setActiveIndex(dataIndex),
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
      {currentItem?.project.title && (
        <Meta
          currentItem={currentItem}
          hoveredItem={hoveredItem}
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

const Meta = ({
  currentItem,
  hoveredItem,
  hovered,
  zoom,
  style,
  rotation,
}: {
  currentItem: RadialDataType;
  hoveredItem?: RadialDataType | null;
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
      <Link data-slot="label" active={hovered} noAction>
        {currentItem.project.title}
      </Link>
    </motion.div>
  );
};

const Sheet = ({ ref }: { ref: Ref<HTMLDivElement> }) => {
  const { zoom, activeIndex } = useTimeline();
  const [item, setItem] = useState<RadialDataType | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;
    const item = radialData[activeIndex];
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
      <button
        className={styles.backButton}
        onClick={() => {
          const evt = new KeyboardEvent("keydown", { key: "Escape" });
          window.dispatchEvent(evt);
        }}
      >
        Back
      </button>
      {item && <Project key={item.project.title} project={item.project} />}
      <footer className={styles.footer}>
        <button
          onClick={() => {
            const evt = new KeyboardEvent("keydown", { key: "ArrowLeft" });
            window.dispatchEvent(evt);
          }}
        >
          Previous
        </button>
        <button
          onClick={() => {
            const evt = new KeyboardEvent("keydown", { key: "ArrowRight" });
            window.dispatchEvent(evt);
          }}
        >
          Next
        </button>
      </footer>
    </motion.div>
  );
};

function getLines(rootScale: number): [LineTypes, Constants] {
  const LINE_WIDTH_SMALL = 40 * rootScale;
  const LINE_WIDTH_MEDIUM = 45 * rootScale;
  const LINE_WIDTH_LARGE = 72 * rootScale;
  const LABEL_FONT_SIZE = 16 * rootScale;
  const LABEL_MARGIN = 80 * rootScale;
  const RADIUS = 280 * rootScale;
  const SIZE = RADIUS * 2 + LINE_WIDTH_LARGE * 2;

  // Calculate total lines: projects + asset lines
  const PROJECT_COUNT = radialData.length;
  const totalAssetLines = radialData.reduce(
    (sum, item) => sum + item.project.projectAssets.length,
    0,
  );
  const TOTAL_LINES = PROJECT_COUNT + totalAssetLines;
  const ANGLE_INCREMENT = 360 / TOTAL_LINES;

  const lines: LineTypes = [];
  let lineIndex = 0;

  radialData.forEach((item, projectIndex) => {
    // Add the project line
    // Start at -90 degrees (12 o'clock) instead of 0 degrees (3 o'clock)
    const projectRotation = lineIndex * ANGLE_INCREMENT - 90;
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
    item.project.projectAssets.forEach(() => {
      // Start at -90 degrees (12 o'clock) instead of 0 degrees (3 o'clock)
      const assetRotation = lineIndex * ANGLE_INCREMENT - 90;
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
    });
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

function useLines(): [LineTypes, Constants] {
  const [rootScale, setRootScale] = useState(1);

  useEvent("resize", () => {
    const widthScale = window.innerWidth / 960;
    const heightScale = window.innerHeight / 640;
    const newScale = clamp(Math.min(widthScale, heightScale), [0.4, 1]);
    setRootScale(newScale);
  });

  const [lines, constants] = useMemo(() => getLines(rootScale), [rootScale]);

  return [lines, constants];
}

function getRotateForIndex(index: number, rotate: number) {
  const item = radialData[index];
  if (!item) return rotate;

  // Calculate the position of this project in the line array
  let projectLineIndex = 0;
  for (let i = 0; i < index; i++) {
    const project = radialData[i];
    if (project) {
      projectLineIndex += 1 + project.project.projectAssets.length; // Project line + asset lines
    }
  }

  const totalAssetLines = radialData.reduce(
    (sum, item) => sum + item.project.projectAssets.length,
    0,
  );
  const TOTAL_LINES = radialData.length + totalAssetLines;
  const ANGLE_INCREMENT = 360 / TOTAL_LINES;

  // Calculate the target rotation for this project
  const targetRotation = projectLineIndex * ANGLE_INCREMENT;

  // To center the project at the top (12 o'clock), we need to rotate the circle
  // so that the project's angle becomes -90 degrees (since 0 is at 3 o'clock)
  const newRotate = -targetRotation;

  return newRotate;
}

function getIndexForRotate(rotate: number) {
  const totalAssetLines = radialData.reduce(
    (sum, item) => sum + item.project.projectAssets.length,
    0,
  );
  const TOTAL_LINES = radialData.length + totalAssetLines;
  const ANGLE_INCREMENT = 360 / TOTAL_LINES;

  // Find which project is closest to the center (top) based on current rotation
  const sortedByDelta = radialData
    .map((item, index) => {
      // Calculate the position of this project in the line array
      let projectLineIndex = 0;
      for (let i = 0; i < index; i++) {
        const project = radialData[i];
        if (project) {
          projectLineIndex += 1 + project.project.projectAssets.length; // Project line + asset lines
        }
      }

      const targetRotation = projectLineIndex * ANGLE_INCREMENT;
      // When a project is centered using rotate = -targetRotation, its final angle is 0
      // But we want it to be at -90 degrees (12 o'clock), so we need to add -90
      const projectAngle = targetRotation + rotate - 90; // Current angle of the project
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
    })
    .sort((a, b) => a.delta - b.delta);

  const closest = sortedByDelta[0];

  if (!closest) {
    return null;
  }

  return closest.index;
}

const transition: ValueAnimationTransition<number> = {
  type: "spring",
  stiffness: 100,
  damping: 22,
  mass: 1.3,
};

const Project = ({ project }: { project: ProjectType }) => {
  return (
    <a className={styles.content} href={project.url} target="_blank">
      <header className={styles.header}>
        <ScrambleText>{project.title}</ScrambleText>
        {project.description && (
          <p className={styles.description}>{project.description}</p>
        )}
      </header>
      {project.projectAssets.map((asset, assetIndex) => (
        <AnimateSection
          key={`${project.url}-${asset.src}`}
          delay={0.2 + 0.2 * assetIndex}
        >
          <Card
            className={
              asset.aspectRatio === "16:9" ? styles.ratio169 : styles.ratio43
            }
          >
            {asset.type === "image" && (
              <Image
                src={asset.src}
                alt={asset.description ?? ""}
                width={400}
                height={300}
                blurDataURL={asset.dataBlur}
                placeholder={asset.dataBlur ? "blur" : "empty"}
                loading="lazy"
              />
            )}
            {asset.type === "video" && (
              <video autoPlay loop muted>
                <source src={asset.src} type="video/webm" />
                Unsupported.
              </video>
            )}
          </Card>
        </AnimateSection>
      ))}
    </a>
  );
};
