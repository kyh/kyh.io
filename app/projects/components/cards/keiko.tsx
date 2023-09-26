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
      <Card className={styles.card}>
        <Image
          data-full-size
          data-light-only
          src="/projects/keiko-light.png"
          alt="Keiko and Friends sticker set"
          width="600"
          height="300"
        />
        <Image
          data-full-size
          data-dark-only
          src="/projects/keiko-light.png"
          alt="Keiko and Friends sticker set"
          width="600"
          height="300"
        />
      </Card>
    </a>
  );
};
