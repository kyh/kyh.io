"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MotionConfig } from "motion/react";
import { useTheme } from "next-themes";

import type { CityProject } from "./city/draw-landmarks";
import type { CityCallbacks } from "./city/engine";
import type { Theme } from "./city/palette";
import { Pin, PinList } from "./city-pins";

type City = Awaited<ReturnType<typeof loadCity>>;

interface CityMount extends CityCallbacks {
  overlay: HTMLElement | null;
  projects: CityProject[];
  theme: Theme;
  reducedMotion: boolean;
}

const loadCity = async (host: HTMLElement, mount: CityMount) => {
  const { createCity } = await import("./city/engine");
  return createCity(host, { ...mount, shared: true });
};

const CARD_LINGER_MS = 120;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const subscribeMotion = (onChange: () => void) => {
  const query = matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const usePrefersReducedMotion = () =>
  useSyncExternalStore(
    subscribeMotion,
    () => matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

interface TourToggleProps {
  touring: boolean;
  onToggle: () => void;
}

const TourToggle = ({ touring, onToggle }: TourToggleProps) => (
  <button
    type="button"
    aria-label={touring ? "Pause the flyover" : "Play the flyover"}
    className="city-panel absolute top-6 left-6 grid size-8 place-items-center text-[var(--city-ink-soft)] transition-colors hover:text-[var(--city-ink)]"
    onClick={onToggle}
  >
    <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      {touring ? (
        <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
      ) : (
        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
      )}
    </svg>
  </button>
);

interface CityShowcaseProps {
  projects: CityProject[];
}

export const CityShowcase = ({ projects }: CityShowcaseProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pinLayerRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<City | null>(null);
  const pinsRef = useRef(new Map<string, HTMLElement>());
  const { resolvedTheme } = useTheme();
  const theme: Theme = resolvedTheme === "dark" ? "night" : "day";
  const themeRef = useRef(theme);
  const reducedMotion = usePrefersReducedMotion();
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [lit, setLit] = useState<string | null>(null);
  const [touring, setTouring] = useState(false);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) {
      return;
    }
    const urls = new Map(projects.map((project) => [project.slug, project.url]));
    let isMounted = true;
    // A card lingers a beat after its building goes dark, so a mouse crossing
    // from the building onto its card doesn't close and reopen it.
    let closing: ReturnType<typeof setTimeout> | undefined;
    const show = (slug: string | null) => {
      clearTimeout(closing);
      if (slug) {
        setLit(slug);
      } else {
        closing = setTimeout(() => setLit(null), CARD_LINGER_MS);
      }
    };
    const mount = async () => {
      try {
        const city = await loadCity(host, {
          onHover: show,
          onOpen: (slug) => {
            const url = urls.get(slug);
            if (url) {
              window.open(url, "_blank", "noopener,noreferrer");
            }
          },
          onTour: setTouring,
          overlay: overlayRef.current,
          projects,
          reducedMotion,
          theme: themeRef.current,
        });
        if (!isMounted) {
          city.dispose();
          return;
        }
        cityRef.current = city;
        city.setPins(pinsRef.current);
        setStatus("ready");
        if (process.env.NODE_ENV === "development") {
          Object.assign(window, { city });
        }
      } catch {
        // No WebGL: the projects are listed plainly instead.
        if (isMounted) {
          setStatus("failed");
        }
      }
    };
    void mount();
    return () => {
      isMounted = false;
      clearTimeout(closing);
      cityRef.current?.dispose();
      cityRef.current = null;
    };
  }, [projects, reducedMotion]);

  useEffect(() => {
    themeRef.current = theme;
    cityRef.current?.setTheme(theme);
  }, [theme]);

  // The pins sit above the canvas: a wheel or a mouse over an open card is
  // still over the town, so it pans and points there too.
  useEffect(() => {
    const layer = pinLayerRef.current;
    if (!layer) {
      return;
    }
    const onWheel = (event: WheelEvent) => cityRef.current?.wheel(event);
    const onPointerMove = (event: PointerEvent) => cityRef.current?.point(event);
    layer.addEventListener("wheel", onWheel, { passive: false });
    layer.addEventListener("pointermove", onPointerMove);
    return () => {
      layer.removeEventListener("wheel", onWheel);
      layer.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  const pinRef = (slug: string) => (element: HTMLDivElement | null) => {
    if (element) {
      pinsRef.current.set(slug, element);
    } else {
      pinsRef.current.delete(slug);
    }
  };

  return (
    <div className="city fixed inset-0 bg-[var(--city-sea)]">
      <div ref={containerRef} className="absolute inset-0" />
      {/* Visitors' lines and other people's pointers, under the pins so a lit card stays on top. */}
      <div ref={overlayRef} className="pointer-events-none absolute inset-0 overflow-hidden" />
      {status === "failed" ? (
        <PinList projects={projects} />
      ) : (
        <MotionConfig reducedMotion="user">
          <div
            ref={pinLayerRef}
            className="pointer-events-none absolute inset-0 isolate overflow-hidden"
          >
            {projects.map((project) => (
              <Pin
                key={project.slug}
                ref={pinRef(project.slug)}
                project={project}
                isLit={lit === project.slug}
                onHover={(slug) => cityRef.current?.hover(slug)}
                onFocus={(slug) => cityRef.current?.focus(slug)}
                onTap={(slug) => cityRef.current?.tap(slug)}
              />
            ))}
          </div>
        </MotionConfig>
      )}
      {status === "ready" && !reducedMotion && (
        <TourToggle touring={touring} onToggle={() => cityRef.current?.tour(!touring)} />
      )}
      {status === "loading" && (
        <p className="city-panel absolute bottom-[calc(4vh+90px)] left-1/2 -translate-x-1/2 px-3 py-1.5 font-mono text-xs text-[var(--city-ink-soft)]">
          drawing the city…
        </p>
      )}
    </div>
  );
};
