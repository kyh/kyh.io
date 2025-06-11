import { Fragment } from "react";
import Image from "next/image";

import { AnimateSection, ScrambleText } from "@/components/animate-text";
import { Card } from "@/components/card";
import styles from "@/styles/page.module.css";
import { gallery } from "./components/data";

export const metadata = {
  title: "Showcase",
  description: "The ever growing list of things I'm working on.",
};

const Page = () => (
  <main className={styles.container}>
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
    <svg className={styles.timeline} aria-hidden="true">
      <defs>
        <pattern
          id="timeline"
          width="6"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 0H6M0 8H6" className={styles.timelinePath} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#timeline)`} />
    </svg>
    <section className={styles.section}>
      {gallery.map((project, projectIndex) => (
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
  </main>
);

export default Page;
