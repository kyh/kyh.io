"use client";

import { AnimateSection, AnimateText } from "~/components/animate-text";
import { ConditionalContainer } from "~/components/conditional-container";
import { Counter, CountersContainer } from "~/components/counter";
import { Scene } from "~/components/scene";
import { statMap, type Stat } from "~/lib/stat";
import { StatSpan } from "~/components/stat-span";
import { useEffect, useState } from "react";
import styles from "~/components/page.module.css";

export default function HomePage() {
  const [time, setTime] = useState<string | null>(null);
  const [stat, setStat] = useState(statMap.home);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getPstTime());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleMouseEnter = (stat: Stat) => {
    setStat(stat);
  };

  let counter = null;
  if (stat.id === statMap.home.id && time) {
    counter = (
      <>
        <Counter text={time} />
        <span>&nbsp;&#183;&nbsp;San Francisco, CA</span>
      </>
    );
  }
  if (stat.value) {
    counter = (
      <>
        {stat.value && <Counter text={stat.value} />}
        <ConditionalContainer
          condition={!!stat.href}
          container={(children) => (
            <a href={stat.href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          )}
        >
          <span>
            {stat.label && stat.label[0] === "+" ? "" : <>&nbsp;</>}
            {stat.label}
          </span>
        </ConditionalContainer>
      </>
    );
  }

  return (
    <main className={`${styles.container} ${styles.relative}`}>
      <Scene currentStat={stat} />
      <AnimateSection as="header" className={styles.header}>
        <AnimateText className={styles.title}>
          <span onMouseEnter={() => setStat(statMap.home)}>Kaiyu Hsu</span>
        </AnimateText>
      </AnimateSection>
      <AnimateSection as="p" delay={0.1}>
        Hello world. You can call me Kai since we’re pretty much friends now. I
        enjoy{" "}
        <StatSpan stat={statMap.build} onMouseEnter={handleMouseEnter}>
          building things
        </StatSpan>{" "}
        for the internet. By day, I get to do that through{" "}
        <StatSpan stat={statMap.invest} onMouseEnter={handleMouseEnter}>
          investing
        </StatSpan>
        ,{" "}
        <StatSpan stat={statMap.advise} onMouseEnter={handleMouseEnter}>
          advising
        </StatSpan>
        , and{" "}
        <StatSpan stat={statMap.product} onMouseEnter={handleMouseEnter}>
          working on products
        </StatSpan>{" "}
        you may not have heard of, yet. Welcome to my corner of the internet.
      </AnimateSection>
      {counter && <CountersContainer>{counter}</CountersContainer>}
    </main>
  );
}

const getPstTime = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    hour12: true,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
};
