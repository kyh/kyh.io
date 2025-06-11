"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";

import type { SceneRef } from "./components/scene";
import { AnimateSection, ScrambleText } from "@/components/animate-text";
import { Link } from "@/components/link";
import { social } from "@/components/social";
import styles from "@/styles/page.module.css";
import { Footer } from "./components/footer";

const DynamicScene = dynamic(() =>
  import("./components/scene").then((mod) => mod.Scene),
);

const Page = () => {
  const sceneRef = useRef<SceneRef>(undefined);

  return (
    <main className={`${styles.container} ${styles.relative}`}>
      <DynamicScene sceneRef={sceneRef} />
      <header className={styles.header}>
        <ScrambleText
          onMouseEnter={() => sceneRef.current?.trigger("multi")}
          onClick={() => sceneRef.current?.trigger("multi")}
        >
          Kaiyu Hsu
        </ScrambleText>
      </header>
      <AnimateSection as="p" delay={0.1}>
        Hello world. You can call me Kai since we&apos;re pretty much friends
        now. I enjoy{" "}
        <Link
          href="/showcase"
          onMouseEnter={() => sceneRef.current?.trigger("hexagon")}
        >
          creating things
        </Link>{" "}
        for the internet. By day, I get to do that through{" "}
        <Link onMouseEnter={() => sceneRef.current?.trigger("square")}>
          investing
        </Link>
        ,{" "}
        <Link
          href="https://agency.kyh.io"
          onMouseEnter={() => sceneRef.current?.trigger("triangle")}
        >
          advising
        </Link>
        , and{" "}
        <Link
          href={social.github}
          onMouseEnter={() => sceneRef.current?.trigger("circle")}
        >
          building products
        </Link>{" "}
        you may not have heard of, yet. Welcome to my corner of the web.
      </AnimateSection>
      <Footer />
    </main>
  );
};

export default Page;
