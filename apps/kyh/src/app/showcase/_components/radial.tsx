"use client";

import type { MotionStyle, MotionValue, ValueAnimationTransition } from "motion/react";
import type { Dispatch, ReactNode, Ref, SetStateAction } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useScroll } from "@use-gesture/react";
import { animate, motion, useMotionValue, useSpring, useTransform } from "motion/react";

import type { ProjectType } from "@/lib/data";
import { AnimateSection, ScrambleText } from "@/components/animate-text";
import { Card } from "@/components/card";
import { Link } from "@/components/link";
import { useIsHydrated } from "@/lib/use-hydrated";
import { areIntersecting, clamp, useEvent, useHashState, useShortcuts } from "./utils";

interface RadialDataType {
  project: ProjectType;
  degree: number;
  variant?: "small" | "medium" | "large";
}

interface LineType {
  variant: RadialDataType["variant"];
  rotation: number;
  offsetX: number;
  offsetY: number;
  dataIndex: number | null;
}

type LineTypes = LineType[];
type RadialDataTypes = RadialDataType[];

const createRadialData = (projects: ProjectType[]): RadialDataTypes =>
  projects.map((project, index) => ({
    degree: index,
    project,
    variant: "large" as const,
  }));

const SCALE_ZOOM = 6;
const SCALE_DEFAULT = 1;
const SCALE_ZOOM_FACTOR = 0.02;
const SCROLL_SNAP = 250;

interface Constants {
  LINE_WIDTH_SMALL: number;
  LINE_WIDTH_MEDIUM: number;
  LINE_WIDTH_LARGE: number;
  LABEL_FONT_SIZE: number;
  LABEL_MARGIN: number;
  RADIUS: number;
  SIZE: number;
}

export type TimelineContextValue = {
  zoom: boolean;
  rotate: MotionValue<number>;
  hoveredIndex: number | null;
  setHoveredIndex: Dispatch<SetStateAction<number | null>>;
  activeIndex: number | null;
  setActiveIndex: (index: number | null) => void;
  radialData: RadialDataTypes;
} & Constants;

// SAFETY: every consumer sits beneath the provider rendered by Radial, so the
// empty default value is never observed.
const TimelineContext = createContext({} as TimelineContextValue);
const useTimeline = () => useContext(TimelineContext);

interface RadialProps {
  projects: ProjectType[];
}

const transition: ValueAnimationTransition<number> = {
  damping: 22,
  mass: 1.3,
  stiffness: 100,
  type: "spring",
};

// Each project owns one line plus one asset line per two assets (min 1).
const assetLineCount = (item: RadialDataType) =>
  Math.max(1, Math.ceil(item.project.projectAssets.length / 2));

const angleIncrement = (radialData: RadialDataTypes) => {
  let totalLines = radialData.length;
  for (const item of radialData) {
    totalLines += assetLineCount(item);
  }
  return 360 / totalLines;
};

// Position of a project's line within the full line array.
const projectLineIndex = (index: number, radialData: RadialDataTypes) => {
  let lineIndex = 0;
  for (let i = 0; i < index; i += 1) {
    const item = radialData[i];
    if (item) {
      lineIndex += 1 + assetLineCount(item);
    }
  }
  return lineIndex;
};

const getLines = (rootScale: number, radialData: RadialDataTypes): [LineTypes, Constants] => {
  const LINE_WIDTH_SMALL = 40 * rootScale;
  const LINE_WIDTH_MEDIUM = 45 * rootScale;
  const LINE_WIDTH_LARGE = 72 * rootScale;
  const LABEL_FONT_SIZE = 16 * rootScale;
  const LABEL_MARGIN = 80 * rootScale;
  const RADIUS = 280 * rootScale;
  const SIZE = RADIUS * 2 + LINE_WIDTH_LARGE * 2;

  const ANGLE_INCREMENT = angleIncrement(radialData);

  const lines: LineTypes = [];
  let lineIndex = 0;

  // Start at -90 degrees (12 o'clock) instead of 0 degrees (3 o'clock)
  const lineAt = (rotation: number) => {
    const angleRad = (rotation * Math.PI) / 180;
    return {
      offsetX: RADIUS * Math.cos(angleRad),
      offsetY: RADIUS * Math.sin(angleRad),
      rotation,
    };
  };

  for (const [projectIndex, item] of radialData.entries()) {
    lines.push({
      dataIndex: projectIndex,
      variant: item.variant,
      ...lineAt(lineIndex * ANGLE_INCREMENT - 90),
    });
    lineIndex += 1;

    const count = assetLineCount(item);
    for (let i = 0; i < count; i += 1) {
      lines.push({
        dataIndex: null,
        variant: "small" as const,
        ...lineAt(lineIndex * ANGLE_INCREMENT - 90),
      });
      lineIndex += 1;
    }
  }

  return [
    lines,
    {
      LABEL_FONT_SIZE,
      LABEL_MARGIN,
      LINE_WIDTH_LARGE,
      LINE_WIDTH_MEDIUM,
      LINE_WIDTH_SMALL,
      RADIUS,
      SIZE,
    },
  ];
};

const useLines = (radialData: RadialDataTypes): [LineTypes, Constants] => {
  const [rootScale, setRootScale] = useState(1);

  useEvent("resize", () => {
    const widthScale = window.innerWidth / 960;
    const heightScale = window.innerHeight / 640;
    const newScale = clamp(Math.min(widthScale, heightScale), [0.4, 1]);
    setRootScale(newScale);
  });

  const [lines, constants] = useMemo(
    () => getLines(rootScale, radialData),
    [rootScale, radialData],
  );

  return [lines, constants];
};

// Rotation that centers the project at the top (12 o'clock): its line angle
// becomes -90 degrees, since 0 is at 3 o'clock.
const getRotateForIndex = (index: number, rotate: number, radialData: RadialDataTypes) => {
  const item = radialData[index];
  if (!item) {
    return rotate;
  }
  return -(projectLineIndex(index, radialData) * angleIncrement(radialData));
};

const getIndexForRotate = (rotate: number, radialData: RadialDataTypes) => {
  const ANGLE_INCREMENT = angleIncrement(radialData);
  // -90 degrees (12 o'clock) normalized to 0-360
  const topCenterAngle = 270;

  // Find which project is closest to the center (top) based on current rotation
  const sortedByDelta = radialData
    .map((_, index) => {
      const targetRotation = projectLineIndex(index, radialData) * ANGLE_INCREMENT;
      // Centered via rotate = -targetRotation the project sits at 0; it should
      // sit at -90 (12 o'clock), hence the shift
      const projectAngle = targetRotation + rotate - 90;
      const normalizedAngle = ((projectAngle % 360) + 360) % 360;

      const delta = Math.min(
        Math.abs(normalizedAngle - topCenterAngle),
        Math.abs(normalizedAngle - topCenterAngle + 360),
        Math.abs(normalizedAngle - topCenterAngle - 360),
      );

      return {
        delta,
        index,
      };
    })
    .toSorted((a, b) => a.delta - b.delta);

  const [closest] = sortedByDelta;

  if (!closest) {
    return null;
  }

  return closest.index;
};

const Provider = ({ value, children }: { value: TimelineContextValue; children: ReactNode }) => (
  <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>
);

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
  const isPartiallyVisible = hoveredItem?.variant === "medium";

  let opacity = 0;

  if (currentItem.variant === "large") {
    opacity = isPartiallyVisible ? 0.2 : 1;
  }

  if (hovered || zoom) {
    opacity = 1;
  }

  return (
    <motion.div
      className="flex -translate-y-1/2 flex-col items-center whitespace-nowrap"
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

const Line = ({ dataIndex, variant, rotation, offsetX, offsetY }: LineType) => {
  const {
    zoom,
    hoveredIndex,
    activeIndex,
    setActiveIndex,
    setHoveredIndex,
    radialData,
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
  if (variant === "medium") {
    width = LINE_WIDTH_MEDIUM;
  }
  if (variant === "large" || hovered || active) {
    width = LINE_WIDTH_LARGE;
  }

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
      className="radial-line"
      data-variant={variant}
      data-active={active}
      data-hovered={hovered || active}
      style={{
        rotate: rotation,
        width,
        x: RADIUS + offsetX + LINE_WIDTH_LARGE,
        y: RADIUS + offsetY + LINE_WIDTH_LARGE,
      }}
      initial={false}
      animate={{
        scale: zoom ? 0.2 : 1,
        transition: {
          ...transition,
          width: {
            damping: 25,
            stiffness: 250,
            type: "spring",
          },
        },
        width,
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

const Project = ({ project }: { project: ProjectType }) => (
  <a
    className="flex w-full flex-col gap-9"
    href={project.url}
    target="_blank"
    rel="noopener noreferrer"
  >
    <header className="flex flex-col gap-3">
      <ScrambleText>{project.title}</ScrambleText>
      {project.description && <p className="text-foreground-faded">{project.description}</p>}
    </header>
    {project.projectAssets.map((asset, assetIndex) => (
      <AnimateSection key={`${project.url}-${asset.src}`} delay={0.2 + 0.2 * assetIndex}>
        <Card className={asset.aspectRatio === "16:9" ? "aspect-video" : "aspect-[4/3]"}>
          {asset.type === "image" && (
            <Image
              className="object-cover"
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

const Sheet = ({ ref }: { ref: Ref<HTMLDivElement> }) => {
  const { zoom, activeIndex, radialData } = useTimeline();
  // Sticky: the sheet keeps rendering the last project while it animates out.
  const [lastItem, setLastItem] = useState<RadialDataType | null>(null);
  const item = (activeIndex === null ? undefined : radialData[activeIndex]) ?? lastItem;
  if (item !== lastItem) {
    setLastItem(item);
  }

  return (
    <motion.div
      ref={ref}
      className="relative top-0 mx-auto mt-[50dvh] max-w-3xl px-5 pb-[140px]"
      initial={false}
      style={{
        pointerEvents: zoom ? "auto" : "none",
      }}
      animate={{
        filter: zoom ? "blur(0px)" : "blur(20px)",
        opacity: zoom ? 1 : 0,
      }}
      transition={{
        damping: 25,
        delay: zoom ? 0.4 : 0,
        stiffness: zoom ? 150 : 300,
        type: "spring",
      }}
      onAnimationComplete={() => {
        if (!zoom) {
          document.documentElement.scrollTop = 0;
        }
      }}
    >
      <button
        type="button"
        className="radial-back-button text-foreground-faded mb-3 flex items-center gap-1 transition-colors duration-150 hover:text-[var(--body-color-highlighted)] focus-visible:text-[var(--body-color-highlighted)]"
        onClick={() => {
          const evt = new KeyboardEvent("keydown", { key: "Escape" });
          window.dispatchEvent(evt);
        }}
      >
        Back
      </button>
      {item && <Project key={item.project.title} project={item.project} />}
      <footer className="radial-footer mt-6 flex justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            const evt = new KeyboardEvent("keydown", { key: "ArrowLeft" });
            window.dispatchEvent(evt);
          }}
        >
          Previous
        </button>
        <button
          type="button"
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

export const Radial = ({ projects }: RadialProps) => {
  const radialData = useMemo(() => createRadialData(projects), [projects]);

  const ref = useRef<HTMLDivElement>(null);
  const isHydrated = useIsHydrated();
  const scrollY = useMotionValue(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(false);
  const [activeIndex, setActiveIndex] = useHashState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activeNode = useRef<HTMLElement>(null);

  const intersectingAtY = useMotionValue(0);
  const rotate = useSpring(0, { damping: 42, mass: 1.1, stiffness: 150 });
  const scale = useSpring(1, { damping: 50, stiffness: 300 });

  const [lines, constants] = useLines(radialData);

  useShortcuts({
    ArrowLeft: () => {
      if (activeIndex !== null) {
        const len = projects.length;
        const newIndex = (activeIndex + -1 + len) % len;
        setActiveIndex(newIndex);
      }
    },
    ArrowRight: () => {
      if (activeIndex !== null) {
        const len = projects.length;
        const newIndex = (activeIndex + 1 + len) % len;
        setActiveIndex(newIndex);
      }
    },
    Escape: () => {
      if (!zoom) {
        rotate.set(0);
      }
      activeNode.current?.blur();
      animate(scrollY, 0, transition);
      scale.set(SCALE_DEFAULT);
      setActiveIndex(null);
    },
  });

  useScroll(
    ({ delta: [, dy], offset: [, oy] }) => {
      scrollY.stop();
      scrollY.set(-oy);

      if (sheetRef.current && activeNode.current) {
        const intersecting = areIntersecting(sheetRef.current, activeNode.current);
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
          const index = getIndexForRotate(rotate.get(), radialData);
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
      target: typeof window === "undefined" ? undefined : window,
    },
  );

  useEffect(() => {
    window.history.scrollRestoration = "manual";
    document.documentElement.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const rotateToIndex = (targetIndex: number | null) => {
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
          behavior: "smooth",
          left: 0,
          top: SCROLL_SNAP,
        });
      } else {
        document.documentElement.scrollTop = SCROLL_SNAP;
      }

      const newRotate = getRotateForIndex(targetIndex, rotate.get(), radialData);
      if (newRotate === rotate.get()) {
        return;
      }
      rotate.set(newRotate);
    };

    const activeElement = document.querySelector("[data-active=true]");
    if (activeElement instanceof HTMLElement) {
      activeNode.current = activeElement;
    }
    rotateToIndex(activeIndex);
  }, [activeIndex, rotate, zoom, setActiveIndex, radialData]);

  useEvent("resize", () => {
    intersectingAtY.set(0);
  });

  return (
    <Provider
      value={{
        ...constants,
        activeIndex,
        hoveredIndex,
        radialData,
        rotate,
        setActiveIndex,
        setHoveredIndex,
        zoom,
      }}
    >
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[animateIn_0.2s_ease-out_forwards] opacity-0 min-[900px]:scale-[0.8]">
        <motion.div
          className="absolute top-1/2 left-1/2 origin-[50%_7dvh] -translate-x-1/2 -translate-y-1/2"
          style={{
            filter: useTransform(scrollY, (y) => {
              if (intersectingAtY.get() === 0) {
                return "blur(0px)";
              }
              const offsetY = Math.abs(y) - intersectingAtY.get();
              const blur = clamp(offsetY * 0.005, [1, 4]);
              return `blur(${blur}px)`;
            }),
            height: constants.SIZE,
            scale,
            width: constants.SIZE,
          }}
        >
          {/* Rotate */}
          {isHydrated && (
            <motion.div
              ref={ref}
              className="h-full w-full"
              style={{ rotate }}
              transition={transition}
            >
              {lines.map((line, index) => (
                <Line key={index} {...line} />
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
      <Sheet ref={sheetRef} />
    </Provider>
  );
};
