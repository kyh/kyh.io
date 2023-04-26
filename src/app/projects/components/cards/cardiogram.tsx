import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./cardiogram.module.css";

export const CardiogramCard = () => {
  return (
    <a
      href="https://www.theverge.com/2017/5/15/15640942/apple-watch-cardiogram-heart-health-artificial-intelligence-monitoring"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Card className={styles.card}>
        <Image
          data-full-size
          data-light-only="true"
          src="/projects/cardiogram-light.png"
          alt="Cardiogram"
          width="600"
          height="300"
        />
        <Image
          data-full-size
          data-dark-only="true"
          src="/projects/cardiogram-dark.png"
          alt="Cardiogram"
          width="600"
          height="300"
        />
      </Card>
    </a>
  );
};
