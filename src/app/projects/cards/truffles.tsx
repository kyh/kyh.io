import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./truffles.module.css";

export const TrufflesCard = () => {
  return (
    <a href="https://truffles.tv/" target="_blank" rel="noopener noreferrer">
      <Card className={styles.card}>Truffles (coming soon)</Card>
    </a>
  );
};
