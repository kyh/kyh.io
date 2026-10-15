"use client";

import type { Ref } from "react";
import Image from "next/image";
import { motion } from "motion/react";

import type { CityProject } from "./city/draw-landmarks";

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return url;
  }
};

/** The icon opening into the card, and closing back down into it. */
const MORPH = { damping: 32, stiffness: 420, type: "spring" } as const;

interface PinProps {
  project: CityProject;
  isLit: boolean;
  ref: Ref<HTMLDivElement>;
  onHover: (slug: string | null) => void;
  onFocus: (slug: string) => void;
  onTap: (slug: string) => void;
}

/**
 * A project's icon, floating over its building: a real link to the project,
 * so it can be tabbed to, middle-clicked and read by crawlers. The city keeps
 * it over its roof; while the building is lit the icon opens into its card.
 * A finger can't hover, so its first tap on a closed icon opens the card and
 * a tap on the card follows the link.
 */
export const Pin = ({ project, isLit, ref, onHover, onFocus, onTap }: PinProps) => (
  <div ref={ref} className="city-pin" data-hidden="true" data-lit={isLit}>
    <span className="city-pin-stem" aria-hidden />
    <div className="city-pin-body">
      <motion.a
        layout
        transition={MORPH}
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="city-pin-icon pointer-events-auto text-xs"
        style={{ borderRadius: isLit ? 8 : 9 }}
        aria-label={`${project.title}, ${hostOf(project.url)}: ${project.description}`}
        onPointerMove={(event) => {
          // Only a pointer that moves takes the icon: one gliding under a
          // resting cursor during the flyover leaves the show running. A
          // finger moving is a drag, not a hover.
          if (event.pointerType !== "touch" && (event.movementX !== 0 || event.movementY !== 0)) {
            onHover(project.slug);
          }
        }}
        onPointerLeave={(event) => {
          // A finger leaves as it lifts: the card it opened stays open.
          if (event.pointerType !== "touch") {
            onHover(null);
          }
        }}
        onPointerDown={(event) => {
          // Read at the press: Safari reports a tap's click as a mouse's.
          event.currentTarget.dataset.press = event.pointerType;
        }}
        onClick={(event) => {
          // A keyboard's click (detail 0) always follows the link.
          const isTouch = event.detail > 0 && event.currentTarget.dataset.press === "touch";
          if (isTouch && !isLit) {
            event.preventDefault();
            onTap(project.slug);
          }
        }}
        onFocus={(event) => {
          // Only the keyboard's focus brings the building into view; a click
          // or tap focuses the link too, on its way to opening it.
          if (event.currentTarget.matches(":focus-visible")) {
            onFocus(project.slug);
          }
        }}
        onBlur={() => onHover(null)}
      >
        <motion.span layout transition={MORPH} className="flex items-center gap-2">
          <motion.span layout transition={MORPH} className="block shrink-0">
            <Image src={project.favicon} alt="" width={26} height={26} />
          </motion.span>
          {isLit && (
            <motion.span
              layout
              transition={MORPH}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.15 } }}
              className="block min-w-0"
            >
              <span className="block truncate font-bold">{project.title}</span>
              <span className="block truncate text-[11px] text-[var(--city-ink-soft)]">
                {hostOf(project.url)}
              </span>
            </motion.span>
          )}
        </motion.span>
        {isLit && (
          <motion.span
            layout
            transition={MORPH}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.12, duration: 0.15 } }}
            className="mt-1.5 block text-[11px] leading-snug"
          >
            {project.description}
          </motion.span>
        )}
      </motion.a>
    </div>
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
          className="city-panel flex items-start gap-2.5 px-3 py-2.5 text-xs transition-colors hover:bg-[var(--city-paper-hover)]"
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
