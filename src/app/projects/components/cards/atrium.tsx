import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./atrium.module.css";

export const AtriumCard = () => {
  return (
    <a
      href="https://www.ycombinator.com/companies/atrium"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Card className={styles.card}>
        <h2>
          Legal services <br /> delivered differently.
        </h2>
        <Image
          data-full-size
          src="/projects/atrium.png"
          alt="Atrium"
          width="600"
          height="300"
        />
      </Card>
    </a>
  );
};
