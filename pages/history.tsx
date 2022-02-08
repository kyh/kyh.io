import type { NextPage } from "next";
import { SEO } from "@components/SEO";
import styles from "styles/Page.module.css";

const Page: NextPage = () => {
  return (
    <main className={styles.container}>
      <SEO />
      <header className={styles.header}>
        <h1 className={styles.title}>Once upon a time</h1>
      </header>
    </main>
  );
};

export default Page;
