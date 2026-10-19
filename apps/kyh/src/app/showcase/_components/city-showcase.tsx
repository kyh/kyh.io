"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Hourglass } from "lucide-react";
import { MotionConfig } from "motion/react";

import type { CityProject } from "./city/draw-landmarks";
import type { CityCallbacks } from "./city/engine";
import type { Scheme } from "./city/palette";
import { schemeAt } from "./city/palette";
import type { Theme } from "@/seasons/store";
import { currentTheme, subscribeToTheme } from "@/seasons/store";
import { Pin, PinList } from "./city-pins";

type City = Awaited<ReturnType<typeof loadCity>>;

interface CityMount extends CityCallbacks {
  overlay: HTMLElement | null;
  surface: HTMLElement;
  projects: CityProject[];
  scheme: Scheme;
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

/** The city by day or night, as the site's theme is, in the season's look. */
const schemeOf = ({ mode, season }: Theme): Scheme =>
  schemeAt(mode === "dark" ? "night" : "day", season);

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
  const rootRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<City | null>(null);
  const pinsRef = useRef(new Map<string, HTMLElement>());
  // The theme needs the visitor's date and their light or dark, which a render
  // (on the server too) can't read: the city starts in the default's and
  // takes theirs on mount.
  const schemeRef = useRef(schemeAt("day", "classic"));
  const reducedMotion = usePrefersReducedMotion();
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [lit, setLit] = useState<string | null>(null);
  const [touring, setTouring] = useState(false);

  // Not `body:has(.city)`: cacheComponents keeps this route mounted, hidden,
  // after leaving it, and only effects learn that it has gone.
  useEffect(() => {
    document.body.dataset.city = "";
    return () => {
      delete document.body.dataset.city;
    };
  }, []);

  useEffect(() => {
    const host = containerRef.current;
    const surface = rootRef.current;
    if (!host || !surface) {
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
          scheme: schemeRef.current,
          surface,
        });
        if (!isMounted) {
          city.dispose();
          return;
        }
        cityRef.current = city;
        // The theme or the season may have changed while the city loaded.
        city.setScheme(schemeRef.current);
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

  // The theme reaches the city by subscription, not a render of the page.
  useEffect(() => {
    const update = () => {
      schemeRef.current = schemeOf(currentTheme());
      cityRef.current?.setScheme(schemeRef.current);
    };
    update();
    return subscribeToTheme(update);
  }, []);

  const pinRef = (slug: string) => (element: HTMLDivElement | null) => {
    if (element) {
      pinsRef.current.set(slug, element);
    } else {
      pinsRef.current.delete(slug);
    }
  };

  return (
    <div ref={rootRef} className="city fixed inset-0 bg-[var(--city-sea)]">
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
      {status === "ready" && !reducedMotion && (
        <TourToggle touring={touring} onToggle={() => cityRef.current?.tour(!touring)} />
      )}
      {status === "loading" && (
        <output
          aria-label="Loading the city"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--city-ink-soft)]"
        >
          <Hourglass
            aria-hidden="true"
            className="size-5 animate-[hourglass-turn_1.6s_ease-in-out_infinite] motion-reduce:animate-none"
          />
        </output>
      )}
    </div>
  );
};
