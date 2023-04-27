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
          src="/projects/founding-logo.png"
          alt="Founding"
          width="75"
          height="75"
        />
      </Card>
    </a>
  );
};
