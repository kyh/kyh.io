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
      <Card className={styles.card}>Atrium</Card>
    </a>
  );
};
