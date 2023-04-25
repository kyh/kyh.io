import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./tc.module.css";

export const TCCard = () => {
  return (
    <a href="https://tc.kyh.io/" target="_blank" rel="noopener noreferrer">
      <Card className={styles.card}>
        Total Compensation Calculator (coming soon)
      </Card>
    </a>
  );
};
