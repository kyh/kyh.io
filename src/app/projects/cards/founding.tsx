import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./founding.module.css";

export const FoundingCard = () => {
  return (
    <a href="https://founding.so/" target="_blank" rel="noopener noreferrer">
      <Card className={styles.card}>Founding</Card>
    </a>
  );
};
