import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./slyce.module.css";

export const SlyceCard = () => {
  return (
    <a
      href="https://www.retailtouchpoints.com/features/news-briefs/slyce-to-go-public-following-merger"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Card className={styles.card}>Slyce</Card>
    </a>
  );
};
