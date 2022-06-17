import type { NextPage } from "next";
import { SEO } from "@components/SEO";
import { AnimateText, AnimateSection } from "@components/AnimateText";
import { Link } from "@components/Link";
import styles from "styles/Page.module.css";

const Page: NextPage = () => {
  return (
    <main className={styles.container}>
      <SEO title="Projects" />
      <header className={styles.header}>
        <AnimateText
          className={styles.title}
          rotate={["code", "pixels", "limits"]}
        >
          Pushing
        </AnimateText>
      </header>
      <AnimateSection as="p" delay={0.1}>
        The ever growing list of things I’m working on.
      </AnimateSection>
      <section className={styles.grid}>
        <div>
          <AnimateSection as="h2" className={styles.caption} delay={0.2}>
            Projects
          </AnimateSection>
          <ul className={`${styles.list} ${styles.projectList}`}>
            <AnimateSection as="li" delay={0.4}>
              <Link href="https://yourssincerely.org">Yours Sincerely</Link>
            </AnimateSection>
            <AnimateSection as="li" delay={0.45}>
              <Link href="https://playhouse.gg">Playhouse</Link>
            </AnimateSection>
            <AnimateSection as="li" delay={0.5}>
              <Link href="https://uicapsule.com">UI Capsule</Link>
            </AnimateSection>
            <AnimateSection as="li" delay={0.55}>
              <Link href="https://tc.kyh.io">TC Calculator</Link>
            </AnimateSection>
            <AnimateSection as="li" delay={0.6}>
              <Link href="https://proxy.kyh.io">API Proxy</Link>
            </AnimateSection>
          </ul>
        </div>
        <div>
          <AnimateSection as="h2" className={styles.caption} delay={0.7}>
            Advising
          </AnimateSection>
          <ul className={`${styles.list} ${styles.projectList}`}>
            <AnimateSection as="li" delay={0.9}>
              <Link href="https://founding.so">Founding</Link>
            </AnimateSection>
            <AnimateSection as="li" delay={0.95}>
              <Link href="https://medervahealth.com">Mederva Health</Link>
            </AnimateSection>
            <AnimateSection as="li" delay={1}>
              <Link href="https://www.crunchbase.com/organization/tinyrx">
                TinyRx
              </Link>
            </AnimateSection>
          </ul>
        </div>
      </section>
    </main>
  );
};

export default Page;
