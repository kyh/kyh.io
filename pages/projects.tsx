import type { NextPage } from "next";
import { SEO } from "@components/SEO";
import { AnimateText } from "@components/AnimateText";
import { TippyLink } from "@components/TippyLink";
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
          <ul className={`${styles.list} ${styles.projectList}`}>
            <li>
              <TippyLink
                text="Yours Sincerely"
                href="https://yourssincerely.org"
              />
            </li>
            <li>
              <TippyLink text="Playhouse" href="https://playhouse.gg" />
            </li>
            <li>
              <TippyLink text="UI Capsule" href="https://uicapsule.com" />
            </li>
            <li>
              <TippyLink text="Inteligir" href="https://inteligir.com" />
            </li>
          </ul>
        </div>
        <div>
          <h2 className={styles.caption}>Consulting</h2>
          <ul className={`${styles.list} ${styles.projectList}`}>
            <li>
              <TippyLink text="Founding" href="https://founding.so" />
            </li>
            <li>
              <TippyLink
                text="Mederva Health"
                href="https://medervahealth.com"
              />
            </li>
            <li>
              <TippyLink
                text="Local Kitchens"
                href="https://localkitchens.com/"
              />
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
};

export default Page;
