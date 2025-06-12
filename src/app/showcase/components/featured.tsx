"use client";

import { Fragment } from "react";
import Image from "next/image";

import { AnimateSection, ScrambleText } from "@/components/animate-text";
import { Card } from "@/components/card";
import { featured } from "./data";
import styles from "./featured.module.css";

export const Featured = () => {
  return (
    <section className={styles.container}>
      <aside className={styles.aside}>
        <ScrambleText className={styles.asideTitle}>Project Name</ScrambleText>
        <p className={styles.asideDescription}>
          Project Description Lorem ipsum dolor sit amet consectetur adipisicing
          elit. Explicabo dicta.
        </p>
        <a
          className={styles.asideLink}
          href="https://www.google.com"
          target="_blank"
        >
          View Project
        </a>
      </aside>
      <section className={styles.projects}>
        {featured.map((project, projectIndex) => (
          <Fragment key={projectIndex}>
            {project.projectAssets.map((asset, assetIndex) => (
              <AnimateSection
                key={`${projectIndex}-${assetIndex}`}
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
          </Fragment>
        ))}
      </section>
    </section>
  );
};
