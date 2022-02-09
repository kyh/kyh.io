import type { NextPage } from "next";
import { SEO } from "@components/SEO";
import { AnimateText } from "@components/AnimateText";
import styles from "styles/Page.module.css";

const Page: NextPage = () => {
  return (
    <main className={styles.container}>
      <SEO />
      <header className={styles.header}>
        <AnimateText className={styles.title}>A long time ago</AnimateText>
      </header>
    </main>
  );
};

export default Page;
