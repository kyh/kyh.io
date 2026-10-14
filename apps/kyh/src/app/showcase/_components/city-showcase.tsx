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
  onPeople: (count: number) => void;
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

interface CityShowcaseProps {
  projects: CityProject[];
}

export const CityShowcase = ({ projects }: CityShowcaseProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<City | null>(null);
  const pinsRef = useRef(new Map<string, HTMLElement>());
  const { resolvedTheme } = useTheme();
  const theme: Theme = resolvedTheme === "dark" ? "night" : "day";
  const themeRef = useRef(theme);
  const reducedMotion = usePrefersReducedMotion();
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [lit, setLit] = useState<string | null>(null);
  const [people, setPeople] = useState(1);

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
          onPeople: setPeople,
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
          <div className="pointer-events-none absolute inset-0 isolate overflow-hidden">
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
      {status === "ready" && (
        <p className="city-panel absolute right-4 bottom-[calc(4vh+90px)] px-2.5 py-1 font-mono text-[11px] text-[var(--city-ink-soft)] sm:bottom-6">
          {people > 1 ? `${people} in town · ` : ""}pick up a car
        </p>
      )}
      {status === "loading" && (
        <p className="city-panel absolute bottom-[calc(4vh+90px)] left-1/2 -translate-x-1/2 px-3 py-1.5 font-mono text-xs text-[var(--city-ink-soft)]">
          drawing the city…
        </p>
      )}
    </div>
  );
};
