import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./keiko.module.css";

export const KeikoCard = () => {
  return (
    <a
      href="https://apps.apple.com/us/app/id1209391711/"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Card className={styles.card}>Keiko and Friends (coming soon)</Card>
    </a>
  );
};
