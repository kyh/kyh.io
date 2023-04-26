import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./uicapsule.module.css";

export const UICapsuleCard = () => {
  return (
    <a href="https://uicapsule.com" target="_blank" rel="noopener noreferrer">
      <Card className={styles.card}>UICapsule</Card>
    </a>
  );
};
