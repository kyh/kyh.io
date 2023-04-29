import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./uicapsule.module.css";

export const UICapsuleCard = () => {
  return (
    <a href="https://uicapsule.com" target="_blank" rel="noopener noreferrer">
      <Card className={styles.card}>
        <Image
          data-full-size
          data-light-only
          src="/projects/uicapsule-light.png"
          alt="UICapsule"
          width="600"
          height="300"
        />
        <Image
          data-full-size
          data-dark-only
          src="/projects/uicapsule-dark.png"
          alt="UICapsule"
          width="600"
          height="300"
        />
      </Card>
    </a>
  );
};