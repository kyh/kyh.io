import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./stonksville.module.css";

export const StokevilleCard = () => {
  return (
    <a
      href="https://stonksville.com/"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Card className={styles.card}>Stonksville</Card>
    </a>
  );
};
