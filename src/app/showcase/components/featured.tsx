"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useInView } from "motion/react";

import type { Project } from "./data";
import { AnimateSection, ScrambleText } from "@/components/animate-text";
import { Card } from "@/components/card";
import { Link } from "@/components/link";
import { featured } from "./data";
import styles from "./featured.module.css";

export const Featured = () => {
  const [activeProject, setActiveProject] = useState<Project>(featured[0]!);

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
            setActiveProject={setActiveProject}
          />
        ))}
      </section>
    </section>
  );
};

const Project = ({
  project,
  projectIndex,
  setActiveProject,
}: {
  project: Project;
  projectIndex: number;
  setActiveProject: (project: Project) => void;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref);

  useEffect(() => {
    if (isInView) {
      setActiveProject(project);
    }
  }, [setActiveProject, isInView, project]);

  return (
    <a ref={ref} className={styles.project} href={project.url} target="_blank">
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
              <video autoPlay muted loop>
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
