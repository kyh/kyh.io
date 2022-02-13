import type { NextPage } from "next";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@components/SEO";
import { Scene } from "@components/Scene";
import { RoleNav } from "@components/RoleNav";
import styles from "styles/Page.module.css";
import { Counter, CountersContainer } from "@components/Counter";
import { data } from "@lib/role";

const Page: NextPage = () => {
  const router = useRouter();
  const [stat, setStat] = useState({ label: "", value: 0, href: "" });

  useEffect(() => {
    const stats = data[router.asPath as keyof typeof data];
    setStat(stats.stat);
  }, [router.asPath]);

  return (
    <main className={`${styles.container} ${styles.relative}`}>
      <SEO />
      <Scene />
      <header className={styles.header}>
        <h1 className={styles.title}>Kaiyu Hsu</h1>
        <RoleNav />
      </header>
      <CountersContainer>
        <Counter text={stat.value} />
        {stat.href ? (
          <a href={stat.href} target="_blank" rel="noopener noreferrer">
            {stat.label}
          </a>
        ) : (
          stat.label
        )}
      </CountersContainer>
    </main>
  );
};

export default Page;
