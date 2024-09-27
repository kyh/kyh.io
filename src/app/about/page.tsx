import Image from "next/image";

import { AnimateSection, ScrambleText } from "@/components/animate-text";
import { Link } from "@/components/link";
import { SocialLinks } from "@/components/social";
import styles from "@/styles/page.module.css";

export const metadata = {
  title: "About",
  description: "Who is this kid?",
};

const AboutPage = () => (
  <main className={styles.container}>
    <header className={styles.header}>
      <ScrambleText className={styles.title}>About me</ScrambleText>
    </header>
    <section className={styles.section}>
      <AnimateSection as="p" delay={0.1}>
        I help companies build and scale people-centric products. Historically,
        my roles have straddled the worlds of engineering, product, and design —
        solving complex problems while pursuing delight and craftmanship.
      </AnimateSection>
    </section>
    <section className={styles.section}>
      <AnimateSection as="h2" delay={0.3}>
        Career Highlights
      </AnimateSection>
      <ul className={styles.list}>
        <AnimateSection as="li" delay={0.35}>
          Oversaw product growth from dozens to millions of users
        </AnimateSection>
        <AnimateSection as="li" delay={0.4}>
          Published research on{" "}
          <Link
            href="https://www.ahajournals.org/doi/10.1161/circ.136.suppl_1.21029"
            src="/screenshots/research.webp"
          >
            growth and retention
          </Link>
        </AnimateSection>
        <AnimateSection as="li" delay={0.45}>
          Led software development at various{" "}
          <Link href="https://amazon.com" src="/screenshots/amazon.webp">
            large
          </Link>{" "}
          <Link href="https://grow.google/" src="/screenshots/google.webp">
            organizations
          </Link>
        </AnimateSection>
        <AnimateSection as="li" delay={0.5}>
          Helped build the frontend framework for the{" "}
          <Link
            href="https://techcrunch.com/2020/09/01/amazons-big-redesign-on-ios-to-reach-all-u-s-users-by-month-end/"
            src="/screenshots/amazon-redesign.webp"
          >
            worlds largest retailer
          </Link>
        </AnimateSection>
        <AnimateSection as="li" delay={0.55}>
          Contributing member of{" "}
          <Link
            href="https://github.com/orgs/usdigitalresponse"
            src="/screenshots/usdr.webp"
          >
            USDR
          </Link>{" "}
          and the{" "}
          <Link
            href="https://github.com/orgs/nodejs"
            src="/screenshots/nodejs.webp"
          >
            OpenJS
          </Link>{" "}
          Foundation
        </AnimateSection>
        <AnimateSection as="li" delay={0.6}>
          Took startups through{" "}
          <Link
            href="https://www.crunchbase.com/organization/cardiogram"
            src="/screenshots/cardiogram.webp"
          >
            acquisitions
          </Link>
          ,{" "}
          <Link
            href="https://retailtouchpoints.com/features/news-briefs/slyce-to-go-public-following-merger"
            src="/screenshots/slyce.webp"
          >
            IPOs
          </Link>
          , and several{" "}
          <Link
            href="https://techcrunch.com/2020/03/03/atrium-shuts-down/"
            src="/screenshots/atrium.webp"
          >
            failures
          </Link>
        </AnimateSection>
      </ul>
    </section>
    <section className={styles.section}>
      <AnimateSection as="h2" delay={0.8}>
        Employment Badges
      </AnimateSection>
      <section className={styles.logos}>
        <AnimateSection delay={0.85}>
          <Link
            href="https://www.crunchbase.com/organization/sequoia-capital"
            noStyles
          >
            <Image
              width={150}
              height={75}
              src="/logos/sequoia.svg"
              alt="Sequoia Capital"
            />
          </Link>
        </AnimateSection>
        <AnimateSection delay={0.9}>
          <Link href="https://www.crunchbase.com/organization/vercel" noStyles>
            <Image
              width={150}
              height={75}
              src="/logos/vercel.svg"
              alt="Vercel"
            />
          </Link>
        </AnimateSection>
        <AnimateSection delay={0.95}>
          <Link href="https://www.crunchbase.com/organization/google" noStyles>
            <Image
              width={150}
              height={75}
              src="/logos/google.svg"
              alt="Google"
            />
          </Link>
        </AnimateSection>
        <AnimateSection delay={1}>
          <Link href="https://www.crunchbase.com/organization/amazon" noStyles>
            <Image
              width={150}
              height={75}
              src="/logos/amazon.svg"
              alt="Amazon"
            />
          </Link>
        </AnimateSection>
        <AnimateSection delay={1.05}>
          <Link
            href="https://www.crunchbase.com/organization/atrium-lts"
            noStyles
          >
            <Image
              width={150}
              height={75}
              src="/logos/atrium.svg"
              alt="Atrium"
            />
          </Link>
        </AnimateSection>
        <AnimateSection delay={1.1}>
          <Link
            href="https://www.crunchbase.com/organization/cardiogram"
            noStyles
          >
            <Image
              width={150}
              height={75}
              src="/logos/cardiogram.svg"
              alt="Cardiogram"
            />
          </Link>
        </AnimateSection>
        <AnimateSection delay={1.15}>
          <Link href="https://www.crunchbase.com/organization/slyce" noStyles>
            <Image width={150} height={75} src="/logos/slyce.svg" alt="Slyce" />
          </Link>
        </AnimateSection>
        <AnimateSection delay={1.2}>
          <Link href="https://www.crunchbase.com/organization/ted" noStyles>
            <Image width={150} height={75} src="/logos/tedx.svg" alt="TEDx" />
          </Link>
        </AnimateSection>
      </section>
    </section>
    <section className={styles.section}>
      <AnimateSection as="h2" delay={1.3}>
        Other Activities
      </AnimateSection>
      <AnimateSection as="p" delay={1.35}>
        Beyond work, I love to learn about economics, psychology, and business.
        You&apos;ll occasionally find me dabbling in the open source world,
        drawing things, building apps, and designing games. But honestly, I
        spend most of my days procrastinating.
      </AnimateSection>
    </section>
    <AnimateSection as="section" delay={1.5}>
      <SocialLinks />
    </AnimateSection>
  </main>
);

export default AboutPage;
