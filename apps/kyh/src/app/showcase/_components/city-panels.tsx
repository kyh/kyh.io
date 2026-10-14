"use client";

import type { Ref } from "react";
import Image from "next/image";
import { ArrowUpRight, List, Maximize2, Minus, Pause, Play, Plus, X } from "lucide-react";

import type { CityProject, ProjectKind } from "./city/draw-landmarks";

const KIND_LABEL: Record<ProjectKind, string> = {
  "mini-app": "Mini app",
  project: "Project",
  template: "Template",
  venture: "Venture",
};

const GROUPS: { label: string; kinds: ProjectKind[] }[] = [
  { kinds: ["venture", "project"], label: "Projects" },
  { kinds: ["mini-app"], label: "Mini apps" },
  { kinds: ["template"], label: "Templates" },
];

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return url;
  }
};

const Favicon = ({ project, size }: { project: CityProject; size: number }) => (
  <Image
    src={project.favicon}
    alt=""
    width={size}
    height={size}
    className="shrink-0 rounded-[5px] border border-[var(--city-line)] bg-[var(--city-paper)]"
  />
);

interface HudProps {
  projects: CityProject[];
  isTouring: boolean;
  isDirectoryOpen: boolean;
  canTour: boolean;
  onTour: () => void;
  onZoom: (factor: number) => void;
  onOverview: () => void;
  onDirectory: () => void;
}

/** The title card, top left: what this is, a count of what's in it, and the camera. */
export const Hud = ({
  projects,
  isTouring,
  isDirectoryOpen,
  canTour,
  onTour,
  onZoom,
  onOverview,
  onDirectory,
}: HudProps) => (
  <div className="city-panel pointer-events-auto w-[min(340px,calc(100vw-32px))] font-mono text-xs">
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--city-line)] px-3 pt-2.5 pb-2">
      <h1 className="text-sm font-bold tracking-wide">Showcase</h1>
      <p className="text-[var(--city-ink-soft)]">a city of things I&apos;ve built</p>
    </div>
    <dl className="grid grid-cols-3 border-b border-[var(--city-line)]">
      {GROUPS.map((group) => (
        <div
          key={group.label}
          className="border-r border-[var(--city-line)] px-3 py-1.5 last:border-r-0"
        >
          <dt className="text-[11px] text-[var(--city-ink-soft)]">{group.label.toLowerCase()}</dt>
          <dd className="text-[15px] font-bold">
            {projects.filter((project) => group.kinds.includes(project.kind)).length}
          </dd>
        </div>
      ))}
    </dl>
    <div className="flex items-center gap-0.5 p-1">
      <button
        type="button"
        className="city-button"
        aria-pressed={isTouring}
        disabled={!canTour}
        onClick={onTour}
      >
        {isTouring ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
        {isTouring ? "pause" : "tour"}
      </button>
      <button
        type="button"
        className="city-button"
        aria-label="Zoom out"
        onClick={() => onZoom(1 / 1.4)}
      >
        <Minus size={14} aria-hidden />
      </button>
      <button
        type="button"
        className="city-button"
        aria-label="Zoom in"
        onClick={() => onZoom(1.4)}
      >
        <Plus size={14} aria-hidden />
      </button>
      <button
        type="button"
        className="city-button"
        aria-label="See the whole island"
        onClick={onOverview}
      >
        <Maximize2 size={14} aria-hidden />
      </button>
      <button
        type="button"
        className="city-button ml-auto"
        aria-pressed={isDirectoryOpen}
        aria-expanded={isDirectoryOpen}
        aria-controls="city-directory"
        onClick={onDirectory}
      >
        <List size={14} aria-hidden />
        directory
      </button>
    </div>
  </div>
);

interface DirectoryProps {
  projects: CityProject[];
  selected: string | null;
  onPick: (slug: string) => void;
}

/** Every building in town, as a list: the keyboard's way in. */
export const Directory = ({ projects, selected, onPick }: DirectoryProps) => (
  <nav
    id="city-directory"
    aria-label="Projects"
    className="city-panel pointer-events-auto max-h-[min(60vh,520px)] w-[min(340px,calc(100vw-32px))] overflow-y-auto font-mono text-xs"
  >
    {GROUPS.map((group) => (
      <section key={group.label} className="border-b border-[var(--city-line)] p-1 last:border-b-0">
        <h2 className="px-2 pt-1 pb-0.5 text-[11px] text-[var(--city-ink-soft)]">
          {group.label.toLowerCase()}
        </h2>
        <ul>
          {projects
            .filter((project) => group.kinds.includes(project.kind))
            .map((project) => (
              <li key={project.slug}>
                <button
                  type="button"
                  className="city-button w-full text-left"
                  aria-pressed={selected === project.slug}
                  onClick={() => onPick(project.slug)}
                >
                  <Favicon project={project} size={18} />
                  <span className="truncate">{project.title}</span>
                </button>
              </li>
            ))}
        </ul>
      </section>
    ))}
  </nav>
);

/** Follows the cursor over a building: its name and a line about it. */
export const HoverCard = ({
  project,
  ref,
}: {
  project: CityProject | null;
  ref: Ref<HTMLDivElement>;
}) => (
  <div
    ref={ref}
    aria-hidden
    className="pointer-events-none fixed top-0 left-0 z-20 will-change-transform"
    style={{ visibility: project ? "visible" : "hidden" }}
  >
    {project && (
      <div className="city-panel flex max-w-[280px] items-start gap-2 px-2.5 py-2 font-mono text-xs">
        <Favicon project={project} size={22} />
        <div className="min-w-0">
          <p className="font-bold">{project.title}</p>
          <p className="line-clamp-2 text-[11px] leading-snug text-[var(--city-ink-soft)]">
            {project.description}
          </p>
        </div>
      </div>
    )}
  </div>
);

/** While the flyover runs, the project it is passing: a title-sequence credit. */
export const PassingCredit = ({
  project,
  onOpen,
}: {
  project: CityProject;
  onOpen: () => void;
}) => (
  <button
    type="button"
    onClick={onOpen}
    className="city-panel pointer-events-auto flex max-w-[min(520px,calc(100vw-32px))] items-center gap-2.5 px-3 py-2 text-left font-mono text-xs transition-colors hover:bg-[var(--city-paper-hover)]"
  >
    <span className="shrink-0 text-[10px] tracking-[0.18em] text-[var(--city-ink-soft)] uppercase">
      now passing
    </span>
    <Favicon project={project} size={18} />
    <span className="shrink-0 font-bold">{project.title}</span>
    <span className="truncate text-[var(--city-ink-soft)]">{project.description}</span>
  </button>
);

interface ProjectPanelProps {
  project: CityProject;
  onClose: () => void;
}

/** The chosen building: what it is, a look at it, and the way in. */
export const ProjectPanel = ({ project, onClose }: ProjectPanelProps) => (
  <section
    aria-label={project.title}
    className="city-panel pointer-events-auto flex w-full flex-col overflow-hidden font-mono text-xs sm:w-[340px]"
  >
    <header className="flex items-start gap-2.5 border-b border-[var(--city-line)] p-3">
      <Favicon project={project} size={36} />
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-bold">{project.title}</h2>
        <p className="text-[11px] text-[var(--city-ink-soft)]">
          {KIND_LABEL[project.kind]} · {hostOf(project.url)}
        </p>
      </div>
      <button
        type="button"
        className="city-button -mt-1 -mr-1"
        aria-label="Close"
        onClick={onClose}
      >
        <X size={14} aria-hidden />
      </button>
    </header>
    {project.media && (
      <div className="relative hidden aspect-video border-b border-[var(--city-line)] bg-[var(--city-sea)] sm:block">
        {project.media.type === "video" ? (
          <video
            key={project.media.src}
            src={project.media.src}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Image src={project.media.src} alt="" fill sizes="340px" className="object-cover" />
        )}
      </div>
    )}
    <p className="p-3 text-[13px] leading-relaxed">{project.description}</p>
    <div className="flex gap-1 border-t border-[var(--city-line)] p-2">
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="city-button flex-1 justify-center bg-[var(--city-ink)] font-bold text-[var(--city-paper)] hover:bg-[var(--city-ink)] hover:opacity-90"
      >
        Visit {hostOf(project.url)}
        <ArrowUpRight size={14} aria-hidden />
      </a>
    </div>
  </section>
);
