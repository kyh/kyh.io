"use client";

import type { PointerEvent } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import type { CityCallbacks } from "./city/engine";
import type { CityProject } from "./city/draw-landmarks";
import type { Theme } from "./city/palette";
import { Directory, HoverCard, Hud, PassingCredit, ProjectPanel } from "./city-panels";

type City = Awaited<ReturnType<typeof loadCity>>;

const loadCity = async (
  host: HTMLElement,
  projects: CityProject[],
  theme: Theme,
  reducedMotion: boolean,
  callbacks: CityCallbacks,
) => {
  const { createCity } = await import("./city/engine");
  return createCity(host, { ...callbacks, projects, reducedMotion, theme });
};

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

/** Room the project panel takes: the right side on wide screens, the bottom on phones. */
const panelInset = () =>
  window.innerWidth >= 640
    ? { bottom: 0, right: 380 }
    : { bottom: window.innerHeight * 0.45, right: 0 };

interface CityShowcaseProps {
  projects: CityProject[];
}

export const CityShowcase = ({ projects }: CityShowcaseProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<City | null>(null);
  const { resolvedTheme } = useTheme();
  const theme: Theme = resolvedTheme === "dark" ? "night" : "day";
  const themeRef = useRef(theme);
  const reducedMotion = usePrefersReducedMotion();
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [isTouring, setIsTouring] = useState(false);
  const [passing, setPassing] = useState<string | null>(null);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const bySlug = new Map(projects.map((project) => [project.slug, project]));
  const selectedProject = selected === null ? null : (bySlug.get(selected) ?? null);
  const hoveredProject =
    hovered === null || hovered === selected ? null : (bySlug.get(hovered) ?? null);
  const passingProject = passing === null ? null : (bySlug.get(passing) ?? null);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) {
      return;
    }
    let isMounted = true;
    const mount = async () => {
      try {
        const city = await loadCity(host, projects, themeRef.current, reducedMotion, {
          onHover: setHovered,
          onPassing: setPassing,
          onSelect: setSelected,
          onTour: setIsTouring,
        });
        if (!isMounted) {
          city.dispose();
          return;
        }
        cityRef.current = city;
        city.setInset(panelInset());
        setStatus("ready");
        if (process.env.NODE_ENV === "development") {
          Object.assign(window, { city });
        }
      } catch {
        // No WebGL: the directory still lists every building.
        if (isMounted) {
          setStatus("failed");
          setIsDirectoryOpen(true);
        }
      }
    };
    void mount();
    const onResize = () => cityRef.current?.setInset(panelInset());
    window.addEventListener("resize", onResize);
    return () => {
      isMounted = false;
      window.removeEventListener("resize", onResize);
      cityRef.current?.dispose();
      cityRef.current = null;
    };
  }, [projects, reducedMotion]);

  useEffect(() => {
    themeRef.current = theme;
    cityRef.current?.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (selected === null) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cityRef.current?.select(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const card = hoverRef.current;
    if (card) {
      const x = Math.min(event.clientX + 16, window.innerWidth - 296);
      card.style.transform = `translate(${x}px, ${event.clientY + 18}px)`;
    }
  };
  const handlePick = (slug: string) => {
    const city = cityRef.current;
    if (city) {
      city.select(slug);
    } else {
      setSelected(slug);
    }
    if (window.innerWidth < 640) {
      setIsDirectoryOpen(false);
    }
  };

  return (
    <div className="city fixed inset-0 bg-[var(--city-sea)]">
      <div ref={containerRef} className="absolute inset-0" onPointerMove={handlePointerMove} />
      <div className="pointer-events-none absolute top-[68px] left-4 z-10 flex flex-col gap-2 sm:top-4">
        <Hud
          projects={projects}
          isTouring={isTouring}
          isDirectoryOpen={isDirectoryOpen}
          canTour={status === "ready"}
          onTour={() => cityRef.current?.setTour(!isTouring)}
          onZoom={(factor) => cityRef.current?.zoomBy(factor)}
          onOverview={() => cityRef.current?.overview()}
          onDirectory={() => setIsDirectoryOpen((open) => !open)}
        />
        {isDirectoryOpen && (
          <Directory projects={projects} selected={selected} onPick={handlePick} />
        )}
        {status === "loading" && (
          <p className="city-panel w-fit px-3 py-2 font-mono text-xs text-[var(--city-ink-soft)]">
            drawing the city…
          </p>
        )}
        {status === "failed" && (
          <p className="city-panel w-[min(340px,calc(100vw-32px))] px-3 py-2 font-mono text-xs text-[var(--city-ink-soft)]">
            This browser can&apos;t draw the city (no WebGL), so here is the directory instead.
          </p>
        )}
      </div>
      {passingProject && isTouring && !selectedProject && (
        <div className="pointer-events-none absolute inset-x-4 bottom-[calc(4vh+86px)] z-10 flex justify-center">
          <PassingCredit project={passingProject} onOpen={() => handlePick(passingProject.slug)} />
        </div>
      )}
      {selectedProject && (
        <div className="pointer-events-none absolute inset-x-2 bottom-[calc(4vh+80px)] z-20 flex sm:inset-x-auto sm:top-16 sm:right-4 sm:bottom-auto">
          <ProjectPanel project={selectedProject} onClose={() => cityRef.current?.select(null)} />
        </div>
      )}
      <HoverCard ref={hoverRef} project={hoveredProject} />
    </div>
  );
};
