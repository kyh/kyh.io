import type { NextPage } from "next";
import { SEO } from "@components/SEO";
import styles from "styles/Page.module.css";

const Page: NextPage = () => {
  return (
    <main className={styles.container}>
      <SEO />
      <header className={styles.header}>
        <h1 className={styles.title}>Kaiyu Hsu</h1>
        <p className={styles.subtitle}>
          UX Engineer / Software Engineer / Designer / Manager / Ring Bearer
        </p>
      </header>
      <p></p>
    </main>
  );
};

export default Page;
