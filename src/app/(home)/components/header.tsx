"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";

import type { SceneRef } from "./scene";
import { ScrambleText } from "@/components/animate-text";
import styles from "@/styles/page.module.css";

const DynamicScene = dynamic(() => import("./scene").then((mod) => mod.Scene));

export const Header = () => {
  const sceneRef = useRef<SceneRef>(undefined);

  const handleTrigger = () => {
    if (sceneRef.current) {
      sceneRef.current.trigger();
    }
  };

  return (
    <>
      <DynamicScene sceneRef={sceneRef} />
      <header className={styles.header}>
        <ScrambleText onMouseEnter={handleTrigger} onClick={handleTrigger}>
          Kaiyu Hsu
        </ScrambleText>
      </header>
    </>
  );
};
