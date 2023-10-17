import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./twoup.module.css";

export const TwoUpCard = () => {
  return (
    <a href="https://2uphq.com/" target="_blank" rel="noopener noreferrer">
      <Card className={styles.card}>2UP</Card>
    </a>
  );
};
