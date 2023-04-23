"use client";

import styles from "./card.module.css";

export const Card = ({ children }: { children: React.ReactNode }) => {
  return (
    <article className={styles.cardContainer}>
      <div className={styles.card}>{children}</div>
    </article>
  );
};

export const CardGrid = ({ children }: { children: React.ReactNode }) => {
  const onMouseMove = ({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent) => {
    Array.from(currentTarget.children).forEach((child) => {
      const { left, top } = child.getBoundingClientRect();
      const x = clientX - left;
      const y = clientY - top;
      (child as HTMLElement).style.setProperty("--mouse-x", `${x}px`);
      (child as HTMLElement).style.setProperty("--mouse-y", `${y}px`);
    });
  };

  return (
    <section className={styles.gridContainer}>
      <section className={styles.grid} onMouseMove={onMouseMove}>
        {children}
      </section>
    </section>
  );
};