import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./founding.module.css";

export const FoundingCard = () => {
  return (
    <a href="https://founding.so/" target="_blank" rel="noopener noreferrer">
      <Card className={styles.card}>
        <video autoPlay muted loop data-full-size>
          <source src="/projects/founding.webm" type="video/webm" />
          Unsupported.
        </video>
        <Image
          className={styles.logo}
          data-light-only
          src="/projects/founding-logo-light.svg"
          alt="Founding"
          width="50"
          height="50"
        />
        <Image
          className={styles.logo}
          data-dark-only
          src="/projects/founding-logo-dark.svg"
          alt="Founding"
          width="50"
          height="50"
        />
        <div className={styles.gradient} aria-hidden="true">
          <div />
          <div />
        </div>
      </Card>
    </a>
  );
};
