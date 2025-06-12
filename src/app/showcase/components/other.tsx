import { Fragment } from "react";
import Image from "next/image";

import { others } from "./data";
import styles from "./other.module.css";

export const Other = () => {
  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Other Things</h2>
      </div>
      <ul className={styles.list}>
        {others.map((project, projectIndex) => (
          <li key={projectIndex}>
            <a href={project.url} target="_blank">
              <div>{project.title}</div>
              <div className={styles.assets}>
                {project.projectAssets.map((asset, assetIndex) => (
                  <div key={`${projectIndex}-${assetIndex}`}>
                    {asset.type === "image" && (
                      <Image
                        src={asset.src}
                        alt={asset.description ?? ""}
                        width={80}
                        height={60}
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
                  </div>
                ))}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};
