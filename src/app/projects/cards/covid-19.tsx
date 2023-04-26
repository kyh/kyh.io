import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./covid-19.module.css";

export const Covid19Card = () => {
  return (
    <a href="https://covid-19.kyh.io" target="_blank" rel="noopener noreferrer">
      <Card className={styles.card}>
        <Image
          data-full-size
          src="/projects/covid19.png"
          alt="Covid-19 Dashboard"
          width="600"
          height="300"
        />
      </Card>
    </a>
  );
};
