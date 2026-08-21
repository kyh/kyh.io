"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { VideoPlatform } from "@/db/drizzle-schema";
import { useKeyboardShortcuts } from "./keyboard-shortcuts-provider";
import { VideoEmbed } from "./video-embed";

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
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <div>{header}</div>
            {showNav && (
              <div className="flex items-center gap-1">
                {videos.map((video, index) => (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => emblaApi?.scrollTo(index)}
                    className={`h-1.5 rounded-full transition-all ${
                      index === selectedIndex
                        ? "w-4 bg-foreground"
                        : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollPrev()}
                  disabled={!canScrollPrev}
                  className={`pl-1 ${canScrollPrev ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/40"}`}
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollNext()}
                  disabled={!canScrollNext}
                  className={`${canScrollNext ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/40"}`}
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </div>
      )}

      <div
        className="touch-pan-y overflow-hidden transition-[height] duration-300"
        ref={emblaRef}
        style={{ height: containerHeight }}
      >
        <div className="flex items-start gap-3">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className="relative min-w-0 flex-[0_0_100%]"
              ref={(el) => {
                if (el) slidesRef.current.set(index, el);
                else slidesRef.current.delete(index);
              }}
            >
              <VideoEmbed url={video.url} platform={video.platform} />
              {isDragging && <div className="absolute inset-0 z-10" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
