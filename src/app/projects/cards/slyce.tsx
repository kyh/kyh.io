import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./slyce.module.css";

export const SlyceCard = () => {
  return (
    <a href="https://slyce.it" target="_blank" rel="noopener noreferrer">
      <Card className={styles.card}>Slyce</Card>
    </a>
  );
};
