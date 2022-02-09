import type { NextPage } from "next";
import { SEO } from "@components/SEO";
import { Scene } from "@components/Scene";
import { RoleNav } from "@components/RoleNav";
import styles from "styles/Page.module.css";

const Page: NextPage = () => {
  return (
    <main className={styles.container}>
      <SEO />
      <Scene />
      <header className={styles.header}>
        <h1 className={styles.title}>Kaiyu Hsu</h1>
        <RoleNav />
      </header>
    </main>
  );
};

export default Page;
