import type { NextPage } from "next";
import { useState } from "react";
import { SEO } from "@components/SEO";
import { Scene } from "@components/Scene";
import { RoleNav } from "@components/RoleNav";
import styles from "styles/Page.module.css";
import { Counters } from "@components/Counter";

const Page: NextPage = () => {
  const [count, setCount] = useState(329);
  const [count2, setCount2] = useState(329);

  return (
    <main className={`${styles.container} ${styles.relative}`}>
      <SEO />
      <Scene />
      <header className={styles.header}>
        <h1 className={styles.title}>Kaiyu Hsu</h1>
        <Counters
          counters={[
            [count, "Commits"],
            [count2, "Projects"],
          ]}
        />
        <RoleNav />
        <button
          onClick={() => {
            setCount(Math.floor(Math.random() * 1000));
            setCount2(Math.floor(Math.random() * 1000));
          }}
        >
          Random
        </button>
      </header>
    </main>
  );
};

export default Page;
