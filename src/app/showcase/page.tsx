import type { Metadata } from "next";

import styles from "@/styles/page.module.css";
import { Featured } from "./components/featured";
import { Other } from "./components/other";

export const metadata: Metadata = {
  title: "Showcase",
  description: "The ever growing list of things I'm working on.",
};

const Page = () => (
  <main>
    <svg className={styles.timeline} aria-hidden="true">
      <defs>
        <pattern
          id="timeline"
          width="6"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path d="M0 0H6M0 8H6" className={styles.timelinePath} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#timeline)`} />
    </svg>
    <Featured />
    <Other />
  </main>
);

export default Page;
