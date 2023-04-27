import { Card } from "~/components/card";
import styles from "./playground.module.css";

export const PlaygroundCard = () => {
  return (
    <a
      href="https://codepen.io/tehkaiyu"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Card className={styles.card}>
        <h2>Playground</h2>
      </Card>
    </a>
  );
};
