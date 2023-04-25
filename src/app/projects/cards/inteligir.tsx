import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./inteligir.module.css";

export const InteligirCard = () => {
  return (
    <a href="https://inteligir.com/" target="_blank" rel="noopener noreferrer">
      <Card className={styles.card}>Inteligir (coming soon)</Card>
    </a>
  );
};
