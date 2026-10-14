"use client";

import type { Ref } from "react";
import Image from "next/image";

import type { CityProject } from "./city/draw-landmarks";

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return url;
  }
};

/** What a lit building says about itself: name, address, one line. */
const Card = ({ project }: { project: CityProject }) => (
  <div className="city-card city-panel pointer-events-none px-3 py-2.5 font-mono text-xs">
    <div className="flex items-center gap-2">
      <Image
        src={project.favicon}
        alt=""
        width={20}
        height={20}
        className="shrink-0 rounded-[4px]"
      />
      <div className="min-w-0">
        <p className="truncate font-bold">{project.title}</p>
        <p className="truncate text-[11px] text-[var(--city-ink-soft)]">{hostOf(project.url)}</p>
      </div>
    </div>
    <p className="mt-1.5 text-[11px] leading-snug">{project.description}</p>
  </div>
);

interface PinProps {
  project: CityProject;
  isLit: boolean;
  ref: Ref<HTMLDivElement>;
  onHover: (slug: string | null) => void;
  onFocus: (slug: string) => void;
}

/**
 * A project's icon, floating over its building: a real link to the project,
 * so it can be tabbed to, middle-clicked and read by crawlers. The city keeps
 * it over its roof; the card shows while the building is lit.
 */
export const Pin = ({ project, isLit, ref, onHover, onFocus }: PinProps) => (
  <div ref={ref} className="city-pin" data-hidden="true" data-lit={isLit}>
    <div className="city-pin-body">
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="city-pin-icon pointer-events-auto"
        aria-label={`${project.title}, ${hostOf(project.url)}: ${project.description}`}
        onMouseEnter={() => onHover(project.slug)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onFocus(project.slug)}
        onBlur={() => onHover(null)}
      >
        <Image src={project.favicon} alt="" width={26} height={26} />
      </a>
      <span className="city-pin-stem" aria-hidden />
    </div>
    {isLit && <Card project={project} />}
  </div>
);

/** Without WebGL there is no city to float over: a plain list instead. */
export const PinList = ({ projects }: { projects: CityProject[] }) => (
  <ul className="pointer-events-auto absolute inset-x-4 top-20 bottom-[calc(4vh+90px)] grid content-start gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
    {projects.map((project) => (
      <li key={project.slug}>
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="city-panel flex items-start gap-2.5 px-3 py-2.5 font-mono text-xs transition-colors hover:bg-[var(--city-paper-hover)]"
        >
          <Image
            src={project.favicon}
            alt=""
            width={24}
            height={24}
            className="shrink-0 rounded-[5px]"
          />
          <span className="min-w-0">
            <span className="block font-bold">{project.title}</span>
            <span className="block text-[11px] text-[var(--city-ink-soft)]">
              {hostOf(project.url)}
            </span>
            <span className="mt-1 block text-[11px] leading-snug">{project.description}</span>
          </span>
        </a>
      </li>
    ))}
  </ul>
);
