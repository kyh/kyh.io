import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./google.module.css";

export const GoogleCard = () => {
  return (
    <a href="https://grow.google/" target="_blank" rel="noopener noreferrer">
      <Card className={styles.card}>
        <video autoPlay muted loop>
          <source src="/projects/google-grow.webm#t=0,54" type="video/webm" />
          Unsupported.
        </video>
        <Image
          src="/projects/google-grow-logo.png"
          alt="Grow with Google"
          width="250"
          height="50"
        />
      </Card>
    </a>
  );
};
