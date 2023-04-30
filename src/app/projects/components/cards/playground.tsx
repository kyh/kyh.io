import { Card } from "~/components/card";
import styles from "./playground.module.css";
import { Particles } from "~/components/particles";

export const PlaygroundCard = () => {
  return (
    <a
      href="https://codepen.io/kyhio"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Card className={styles.card}>
        <h2>Playground</h2>
        <Particles className={styles.particles} />
      </Card>
    </a>
  );
};
