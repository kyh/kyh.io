import type { NextPage } from "next";
import { SEO } from "@components/SEO";
import { RoleNav } from "@components/RoleNav";
import styles from "styles/Page.module.css";

const Page: NextPage = () => {
  return (
    <main className={styles.container}>
      <SEO />
      <header className={styles.header}>
        <h1 className={styles.title}>Kaiyu Hsu</h1>
        <RoleNav />
      </header>
    </main>
  );
};

export default Page;
