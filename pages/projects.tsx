import type { NextPage } from "next";
import { SEO } from "@components/SEO";
import { AnimateText } from "@components/AnimateText";
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
      <p>The ever growing list of things I’m working on.</p>
      <section className={styles.grid}>
        <div>
          <h2 className={styles.caption}>Side Projects</h2>
          <ul className={`${styles.list} ${styles.projectList}`}>
            <li>
              <Link href="https://yourssincerely.org">Yours Sincerely</Link>
            </li>
            <li>
              <Link href="https://playhouse.gg">Playhouse</Link>
            </li>
            <li>
              <Link href="https://uicapsule.com">UI Capsule</Link>
            </li>
            <li>
              <Link href="https://inteligir.com">Inteligir</Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className={styles.caption}>Consulting</h2>
          <ul className={`${styles.list} ${styles.projectList}`}>
            <li>
              <Link href="https://founding.so">Founding</Link>
            </li>
            <li>
              <Link href="https://medervahealth.com">Mederva Health</Link>
            </li>
            {/* <li>
              <Link href="https://www.crunchbase.com/organization/local-kitchens">
                Local Kitchens
              </Link>
            </li> */}
            <li>
              <Link href="https://www.crunchbase.com/organization/tinyrx">
                TinyRx
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
};

export default Page;
