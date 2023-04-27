import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./amazon.module.css";

export const AmazonCard = () => {
  return (
    <a href="https://amazon.com/" target="_blank" rel="noopener noreferrer">
      <Card className={styles.card}>
        <Image
          data-full-size
          data-light-only
          src="/projects/amazon-light.png"
          alt="Amazon Rio Design System"
          width="600"
          height="300"
        />
        <Image
          data-full-size
          data-dark-only
          src="/projects/amazon-dark.png"
          alt="Amazon Rio Design System"
          width="600"
          height="300"
        />
      </Card>
    </a>
  );
};
