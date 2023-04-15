import Image from "next/image";
import { AnimateText, AnimateSection } from "~/components/animate-text";
import { Link } from "~/components/link";
import { social } from "~/lib/social";
import styles from "~/components/page.module.css";

export const metadata = {
  title: "About",
  description: "Who is this kid?",
};

export default function AboutPage() {
  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <AnimateText className={styles.title}>About me</AnimateText>
      </header>
      <section className={styles.section}>
        <AnimateSection as="p" delay={0.1}>
          Throughout my career, I've held positions in both design and
          engineering; working across seed, growth, and public organizations.
          This privilege has allowed me to gain experience in different aspects
          of company building, from growing up with a small 3 person team, to
          learning how to develop and expand products on a global scale, and to
          the challenges of building an enduring company.
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
            Led software development at some really{" "}
            <Link href="https://amazon.com" src="/screenshots/amazon.webp">
              big
            </Link>{" "}
            <Link href="https://grow.google/" src="/screenshots/google.webp">
              companies
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
          <Link href="https://www.crunchbase.com/organization/google" noStyles>
            <Image
              width={150}
              height={75}
              src="/logos/google.svg"
              alt="Google"
            />
          </Link>
        </AnimateSection>
        <AnimateSection delay={0.95}>
          <Link href="https://www.crunchbase.com/organization/amazon" noStyles>
            <Image
              width={150}
              height={75}
              src="/logos/amazon.svg"
              alt="Amazon"
            />
          </Link>
        </AnimateSection>
        <AnimateSection delay={1}>
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
        <AnimateSection delay={1.05}>
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
        <AnimateSection delay={1.1}>
          <Link href="https://www.crunchbase.com/organization/slyce" noStyles>
            <Image width={150} height={75} src="/logos/slyce.svg" alt="Slyce" />
          </Link>
        </AnimateSection>
        <AnimateSection delay={1.15}>
          <Link href="https://www.crunchbase.com/organization/ted" noStyles>
            <Image width={150} height={75} src="/logos/tedx.svg" alt="TEDx" />
          </Link>
        </AnimateSection>
        <AnimateSection delay={1.2}>
          <Link
            href="https://www.crunchbase.com/organization/electronicarts"
            noStyles
          >
            <Image width={150} height={75} src="/logos/ea.svg" alt="EA" />
          </Link>
        </AnimateSection>
      </section>
      <section className={styles.section}>
        <AnimateSection as="h2" delay={1.3}>
          Other Activities
        </AnimateSection>
        <AnimateSection as="p" delay={1.35}>
          Beyond work, I love to learn about economics, psychology, product
          strategy, technology, and startups. You'll occasionally find me
          dabbling in the open source world, contributing to{" "}
          <Link
            href="https://github.com/facebook/react"
            src="/screenshots/fb.webp"
            alt="Facebook"
          >
            Facebook
          </Link>{" "}
          projects,{" "}
          <Link
            href="https://github.com/angular-ui/bootstrap"
            src="/screenshots/bootstrap.webp"
            alt="Bootstrap"
          >
            Bootstrap
          </Link>
          , and Wikipedia. When I'm bored, I sometimes{" "}
          <Link
            href="https://itunes.apple.com/US/app/id1209391711"
            src="/screenshots/keiko.webp"
            alt="Keiko and Friends"
          >
            draw things
          </Link>
          ,{" "}
          <Link
            srcs={[
              {
                href: "https://uicapsule.com",
                src: "/screenshots/uicapsule.webp",
                alt: "UI Capsule",
              },
              {
                href: "https://yourssincerely.org",
                src: "/screenshots/ys.webp",
                alt: "Yours Sincerely",
              },
              {
                href: "https://covid-19.kyh.io",
                src: "/screenshots/covid19.webp",
                alt: "Covid19",
              },
              {
                href: "https://artnotart.art",
                src: "/screenshots/art.webp",
                alt: "Art Not Art",
              },
            ]}
          >
            build apps
          </Link>
          , and{" "}
          <Link
            href="https://truffles.tv"
            src="/screenshots/truffles.webp"
            alt="Truffles"
          >
            design games
          </Link>
          . But honestly, I spend most of my days procrastinating.
        </AnimateSection>
      </section>
      <AnimateSection as="section" delay={1.5} className={styles.socials}>
        <a
          className={styles.git}
          href={social.github}
          aria-label="GitHub"
          target="_blank"
          rel="noreferrer noopener"
        >
          <svg width="16.5" height="17.6" viewBox="0 0 30 32">
            <path d="M0 27.104q0 2.016 1.984 3.456t4.8 1.44 4.832-1.44 1.984-3.456q0-2.048-1.984-3.488t-4.832-1.44q-0.032 0-0.096 0t-0.096 0.032q-0.768-0.704-0.768-1.536t0.768-1.696q2.272-0.128 3.84-1.76t1.568-3.872q0-0.896-0.224-1.6 0.896-0.16 1.408-0.448v-3.68q-1.536 1.024-3.488 1.024h-0.224q-1.472-0.992-3.232-0.992-2.4 0-4.096 1.664t-1.696 4.032q0 1.504 0.768 2.784t2.048 2.048q-0.896 1.152-0.896 2.368 0 1.152 0.832 2.4-1.472 0.672-2.336 1.76t-0.864 2.4zM3.872 13.28q0-1.056 0.704-1.824t1.6-0.736q0.96 0 1.632 0.736t0.672 1.824-0.672 1.792-1.632 0.768q-0.928 0-1.6-0.768t-0.704-1.792zM3.968 27.104q0-0.864 0.832-1.472t1.984-0.576 2.016 0.576 0.832 1.472q0 0.832-0.832 1.44t-2.016 0.608-1.984-0.608-0.832-1.44zM14.56 2.592q0-1.088 0.768-1.856t1.824-0.736 1.856 0.736 0.768 1.856-0.768 1.856-1.856 0.768-1.824-0.768-0.768-1.856zM15.168 23.296v-15.328h4.288v15.328h-4.288zM20.96 11.232h1.76v9.12q0.128 0.96 0.64 1.632t1.088 1.024 1.216 0.512 0.96 0.224h0.64q0.864 0 1.536-0.256 0.736-0.256 0.96-0.512l0.224-0.288 0.064-3.168q-1.344 0.416-2.080 0.416-0.16 0-0.288-0.032-0.736-0.096-0.864-0.512l-0.128-0.416q0-0.096-0.032-0.128v-7.616h2.912v-3.264h-2.912v-2.976h-3.936v2.976h-1.76v3.264z" />
          </svg>
        </a>
        <a
          className={styles.dribbble}
          href={social.dribbble}
          aria-label="Dribbble"
          target="_blank"
          rel="noreferrer noopener"
        >
          <svg width="17.6" height="17.6" viewBox="0 0 32 32">
            <path d="M0 16q0-4.352 2.144-8.032t5.824-5.824 8.032-2.144 8.032 2.144 5.824 5.824 2.144 8.032-2.144 8.032-5.824 5.824-8.032 2.144-8.032-2.144-5.824-5.824-2.144-8.032zM2.656 16q0 4.992 3.36 8.8 1.536-3.008 4.864-5.728t6.496-3.424q-0.48-1.12-0.928-2.016-5.504 1.76-11.904 1.76-1.248 0-1.856-0.032 0 0.128 0 0.32t-0.032 0.32zM3.072 12.704q0.704 0.064 2.080 0.064 5.344 0 10.144-1.44-2.432-4.32-5.344-7.2-2.528 1.28-4.32 3.552t-2.56 5.024zM7.84 26.528q3.616 2.816 8.16 2.816 2.368 0 4.704-0.896-0.64-5.472-2.496-10.592-2.944 0.64-5.92 3.232t-4.448 5.44zM12.736 3.104q2.816 2.912 5.216 7.264 4.352-1.824 6.56-4.64-3.712-3.072-8.512-3.072-1.632 0-3.264 0.448zM19.104 12.64q0.48 1.024 1.088 2.592 2.368-0.224 5.152-0.224 1.984 0 3.936 0.096-0.256-4.352-3.136-7.744-2.080 3.104-7.040 5.28zM20.992 17.472q1.632 4.736 2.208 9.728 2.528-1.632 4.128-4.192t1.92-5.536q-2.336-0.16-4.256-0.16-1.76 0-4 0.16z" />
          </svg>
        </a>
        <a
          className={styles.twitter}
          href={social.twitter}
          aria-label="Twitter"
          target="_blank"
          rel="noreferrer noopener"
        >
          <svg width="21.45" height="17.6" viewBox="0 0 39 32">
            <path d="M0 28.384q0.96 0.096 1.92 0.096 5.632 0 10.048-3.456-2.624-0.032-4.704-1.6t-2.848-4q0.64 0.128 1.504 0.128 1.12 0 2.144-0.288-2.816-0.544-4.64-2.784t-1.856-5.12v-0.096q1.696 0.96 3.68 0.992-1.664-1.088-2.624-2.88t-0.992-3.84q0-2.176 1.12-4.064 3.008 3.744 7.36 5.952t9.28 2.496q-0.224-1.056-0.224-1.856 0-3.328 2.368-5.696t5.728-2.368q3.488 0 5.888 2.56 2.784-0.576 5.12-1.984-0.896 2.912-3.52 4.48 2.336-0.288 4.608-1.28-1.536 2.4-4 4.192v1.056q0 3.232-0.928 6.464t-2.88 6.208-4.64 5.28-6.432 3.68-8.096 1.344q-6.688 0-12.384-3.616z" />
          </svg>
        </a>
        <a
          className={styles.linkedin}
          href={social.linkedin}
          aria-label="LinkedIn"
          target="_blank"
          rel="noreferrer noopener"
        >
          <svg width="18.15" height="17.6" viewBox="0 0 33 32">
            <path d="M0 3.84q0-1.6 1.12-2.656t2.912-1.024q1.76 0 2.848 1.024 1.12 1.056 1.12 2.752 0 1.536-1.088 2.56-1.12 1.056-2.944 1.056h-0.032q-1.76 0-2.848-1.056t-1.088-2.656zM0.416 31.84v-21.376h7.104v21.376h-7.104zM11.456 31.84h7.104v-11.936q0-1.12 0.256-1.728 0.448-1.088 1.376-1.856t2.272-0.736q3.584 0 3.584 4.832v11.424h7.104v-12.256q0-4.736-2.24-7.2t-5.92-2.432q-4.128 0-6.432 3.552v0.064h-0.032l0.032-0.064v-3.040h-7.104q0.064 1.024 0.064 6.368t-0.064 15.008z" />
          </svg>
        </a>
      </AnimateSection>
    </main>
  );
}
