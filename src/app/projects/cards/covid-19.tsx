import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./covid-19.module.css";

export const Covid19Card = () => {
  return (
    <a href="https://covid-19.kyh.io" target="_blank" rel="noopener noreferrer">
      <Card className={styles.card}>Covid-19 Dashboard (coming soon)</Card>
    </a>
  );
};
