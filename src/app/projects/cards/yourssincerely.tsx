import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./yourssincerely.module.css";

export const YoursSincerelyCard = () => {
  return (
    <a
      href="https://yourssincerely.org/"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Card className={styles.card}>
        <Image
          data-light-only="true"
          src="/projects/ys.png"
          alt="Yours Sincerely"
          width="600"
          height="300"
        />
        <Image
          data-dark-only="true"
          src="/projects/ys-dark.png"
          alt="Yours Sincerely"
          width="600"
          height="300"
        />
      </Card>
    </a>
  );
};
