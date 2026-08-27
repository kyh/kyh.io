"use client";

import { theme } from "../app/styles/tokens.stylex";

import {
  defaults,
  fontSizeLineHeights,
  fontSizes,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { VideoPlatform } from "@/db/drizzle-schema";
import { useKeyboardShortcuts } from "./keyboard-shortcuts-provider";
import { VideoEmbed } from "./video-embed";

const styles = stylex.create({
  header: {
    marginBottom: spacing[3],
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    color: theme.mutedForeground,
  },
  row3: { display: "flex", alignItems: "center", gap: spacing[3] },
  row2: { display: "flex", alignItems: "center", gap: spacing[2] },
  row1: { display: "flex", alignItems: "center", gap: spacing[1] },
  dot: {
    height: spacing[1.5],
    borderRadius: radii.full,
    transitionProperty: "all",
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: defaults.transitionDuration,
  },
  dotOn: { width: spacing[4], backgroundColor: theme.foreground },
  dotOff: {
    width: spacing[1.5],
    backgroundColor: {
      default: "color-mix(in oklab, var(--muted-foreground) 30%, transparent)",
      "@media (hover: hover)": {
        default: "color-mix(in oklab, var(--muted-foreground) 30%, transparent)",
        ":hover": "color-mix(in oklab, var(--muted-foreground) 50%, transparent)",
      },
    },
  },
  navPrev: { paddingLeft: spacing[1] },
  navOn: {
    color: {
      default: theme.mutedForeground,
      "@media (hover: hover)": { default: theme.mutedForeground, ":hover": theme.foreground },
    },
  },
  navOff: { color: "color-mix(in oklab, var(--muted-foreground) 40%, transparent)" },
  chevron: { height: spacing[4], width: spacing[4] },
  viewport: {
    touchAction: "pan-y",
    overflow: "hidden",
    transitionProperty: "height",
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: ".3s",
  },
  track: { display: "flex", alignItems: "flex-start", gap: spacing[3] },
  slide: { position: "relative", minWidth: 0, flex: "0 0 100%" },
  dragShield: { position: "absolute", inset: 0, zIndex: 10 },
});

type Video = {
  id: number;
  url: string;
  platform: VideoPlatform;
};

type VideoCarouselProps = {
  videos: Video[];
  header?: React.ReactNode;
  headerRight?: React.ReactNode;
  incidentId?: number;
  onSlideChange?: (index: number) => void;
};

export const VideoCarousel = ({
  videos,
  header,
  headerRight,
  incidentId,
  onSlideChange,
}: VideoCarouselProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
  });
  const shortcuts = useKeyboardShortcuts();
  const slidesRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const [containerHeight, setContainerHeight] = useState<number | undefined>();

  // Register carousel with keyboard shortcuts provider
  useEffect(() => {
    if (incidentId === undefined || !shortcuts) return;
    shortcuts.registerCarousel(incidentId, emblaApi ?? null);
    return () => shortcuts.unregisterCarousel(incidentId);
  }, [incidentId, emblaApi, shortcuts]);

  // Embla owns the scroll position; read it as an external store so the first
  // render already has the real values instead of seeding state from an effect.
  const subscribeToEmbla = useCallback(
    (onStoreChange: () => void) => {
      if (!emblaApi) return () => {};
      emblaApi.on("select", onStoreChange);
      emblaApi.on("reInit", onStoreChange);
      return () => {
        emblaApi.off("select", onStoreChange);
        emblaApi.off("reInit", onStoreChange);
      };
    },
    [emblaApi],
  );
  const selectedIndex = useSyncExternalStore(
    subscribeToEmbla,
    () => emblaApi?.selectedScrollSnap() ?? 0,
    () => 0,
  );
  const canScrollPrev = useSyncExternalStore(
    subscribeToEmbla,
    () => emblaApi?.canScrollPrev() ?? false,
    () => false,
  );
  const canScrollNext = useSyncExternalStore(
    subscribeToEmbla,
    () => emblaApi?.canScrollNext() ?? false,
    () => false,
  );

  // Update container height based on current slide
  const updateHeight = useCallback(() => {
    const slide = slidesRef.current.get(selectedIndex);
    if (slide) {
      setContainerHeight(slide.offsetHeight);
    }
  }, [selectedIndex]);

  // Observe slide height changes (for when embeds load)
  useEffect(() => {
    const slide = slidesRef.current.get(selectedIndex);
    if (!slide) return;

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(slide);
    return () => observer.disconnect();
  }, [selectedIndex, updateHeight]);

  useEffect(() => {
    onSlideChange?.(selectedIndex);
  }, [selectedIndex, onSlideChange]);

  useEffect(() => {
    if (!emblaApi) return;
    const onDragStart = () => setIsDragging(true);
    const onDragEnd = () => setIsDragging(false);
    emblaApi.on("pointerDown", onDragStart);
    emblaApi.on("pointerUp", onDragEnd);

    return () => {
      emblaApi.off("pointerDown", onDragStart);
      emblaApi.off("pointerUp", onDragEnd);
    };
  }, [emblaApi]);

  if (videos.length === 0) return null;

  const showNav = videos.length > 1;

  return (
    <div>
      {(header != null || showNav || headerRight != null) && (
        <div {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.row3)}>
            <div>{header}</div>
            {showNav && (
              <div {...stylex.props(styles.row1)}>
                {videos.map((video, index) => (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => emblaApi?.scrollTo(index)}
                    {...stylex.props(
                      styles.dot,
                      index === selectedIndex ? styles.dotOn : styles.dotOff,
                    )}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollPrev()}
                  disabled={!canScrollPrev}
                  {...stylex.props(styles.navPrev, canScrollPrev ? styles.navOn : styles.navOff)}
                  aria-label="Previous"
                >
                  <ChevronLeft {...stylex.props(styles.chevron)} />
                </button>
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollNext()}
                  disabled={!canScrollNext}
                  {...stylex.props(canScrollNext ? styles.navOn : styles.navOff)}
                  aria-label="Next"
                >
                  <ChevronRight {...stylex.props(styles.chevron)} />
                </button>
              </div>
            )}
          </div>
          {headerRight && <div {...stylex.props(styles.row2)}>{headerRight}</div>}
        </div>
      )}

      <div {...stylex.props(styles.viewport)} ref={emblaRef} style={{ height: containerHeight }}>
        <div {...stylex.props(styles.track)}>
          {videos.map((video, index) => (
            <div
              key={video.id}
              {...stylex.props(styles.slide)}
              ref={(el) => {
                if (el) slidesRef.current.set(index, el);
                else slidesRef.current.delete(index);
              }}
            >
              <VideoEmbed url={video.url} platform={video.platform} />
              {isDragging && <div {...stylex.props(styles.dragShield)} aria-hidden="true" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
