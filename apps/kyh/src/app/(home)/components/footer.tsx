"use client";

import { useEffect, useState } from "react";

import { SocialLinks } from "@/components/social";
import { useViewport } from "@/components/viewport";
import { Counter } from "./counter";
import styles from "./footer.module.css";
import { percentY } from "./scene";

export const Footer = () => {
  const size = useViewport();
  const [top, setTop] = useState<string | number>("75vh");
  const [time, setTime] = useState("");

  useEffect(() => {
    setTop(percentY(80));
  }, [size.height]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getPstTime());
    }, 1000);

    const timeout = setTimeout(() => {
      setTime(getPstTime());
    }, 500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className={styles.footer} style={{ top }}>
      <span className={styles.timeContainer}>
        <Counter text={time} />
        {time && <span>&nbsp;&#183;&nbsp;San Francisco, CA</span>}
      </span>
      {time && <SocialLinks className={styles.socials} />}
    </div>
  );
};

const getPstTime = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    hour12: true,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
};
