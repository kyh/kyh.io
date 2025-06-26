import { Link } from "@/components/link";
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
            <Link
              href={project.url}
              srcs={project.projectAssets.map((asset) => ({
                type: asset.type,
                href: project.url,
                src: asset.src,
                alt: project.title,
              }))}
              aspectRatio={
                project.projectAssets.filter(
                  (asset) => asset.aspectRatio === "16:9",
                ).length > 0
                  ? "16:9"
                  : "4:3"
              }
            >
              {project.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
