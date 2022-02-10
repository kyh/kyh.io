import type { NextPage } from "next";
import { SEO } from "@components/SEO";
import { AnimateText } from "@components/AnimateText";
import styles from "styles/Page.module.css";

const Page: NextPage = () => {
  return (
    <main className={styles.container}>
      <SEO />
      <header className={styles.header}>
        <AnimateText
          className={styles.title}
          rotate={["code", "pixels", "limits"]}
        >
          Pushing
        </AnimateText>
      </header>
      <p>The ever growing list of things I’m working on.</p>
      <section className={styles.grid}>
        <div>
          <h2 className={styles.caption}>Side Projects</h2>
          <ul className={`${styles.list} ${styles.listLarge}`}>
            <li>Yours Sincerely</li>
            <li>Playhouse</li>
            <li>UI Capsule</li>
            <li>Inteligir</li>
          </ul>
        </div>
        <div>
          <h2 className={styles.caption}>Consulting</h2>
          <ul className={`${styles.list} ${styles.listLarge}`}>
            <li>Founding</li>
            <li>Mederva Health</li>
            <li>Local Kitchens</li>
          </ul>
        </div>
      </section>
    </main>
  );
};

export default Page;
