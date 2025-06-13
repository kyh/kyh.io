"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import type { Project } from "./data";
import { AnimateSection, ScrambleText } from "@/components/animate-text";
import { Card } from "@/components/card";
import { Link } from "@/components/link";
import { featured } from "./data";
import styles from "./featured.module.css";

export const Featured = () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const [activeProject, setActiveProject] = useState<Project>(featured[0]!);
  const projectRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const checkActiveProject = throttle(() => {
      if (window.innerWidth < 900) return;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      let foundIndex: number | null = null;

      for (let i = 0; i < projectRefs.current.length; i++) {
        const projectEl = projectRefs.current[i];
        if (projectEl) {
          const rect = projectEl.getBoundingClientRect();
          if (
            rect.top <= centerY &&
            rect.bottom >= centerY &&
            rect.left <= centerX &&
            rect.right >= centerX
          ) {
            foundIndex = i;
            break;
          }
        }
      }

      if (foundIndex !== null) {
        setActiveProject(featured[foundIndex]!);
      }
    }, 100);

    checkActiveProject();

    window.addEventListener("scroll", checkActiveProject, { passive: true });
    window.addEventListener("resize", checkActiveProject);

    return () => {
      window.removeEventListener("scroll", checkActiveProject);
      window.removeEventListener("resize", checkActiveProject);
    };
  }, []);

  return (
    <section className={styles.container}>
      <aside className={styles.aside} key={activeProject.title}>
        <ScrambleText className={styles.asideTitle}>
          {activeProject.title}
        </ScrambleText>
        <AnimateSection as="p" className={styles.asideDescription} delay={0.1}>
          {activeProject.description}
        </AnimateSection>
        <AnimateSection delay={0.3}>
          <Link href={activeProject.url}>
            {new URL(activeProject.url).hostname}
          </Link>
        </AnimateSection>
      </aside>
      <section className={styles.projects}>
        {featured.map((project, projectIndex) => (
          <Project
            key={project.url}
            project={project}
            projectIndex={projectIndex}
            ref={(el) => (projectRefs.current[projectIndex] = el)}
          />
        ))}
      </section>
    </section>
  );
};

const Project = ({
  project,
  projectIndex,
  ref,
}: {
  project: Project;
  projectIndex: number;
  ref: (el: HTMLElement | null) => void;
}) => {
  return (
    <a className={styles.project} href={project.url} target="_blank" ref={ref}>
      {project.projectAssets.map((asset, assetIndex) => (
        <AnimateSection
          key={`${project.url}-${asset.src}`}
          delay={0.2 + 0.2 * (projectIndex + assetIndex)}
        >
          <Card>
            {asset.type === "image" && (
              <Image
                src={asset.src}
                alt={asset.description ?? ""}
                width={400}
                height={300}
                blurDataURL={asset.dataBlur}
                placeholder="blur"
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
};

// Throttle function to limit how often a function can be called
const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number,
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};
