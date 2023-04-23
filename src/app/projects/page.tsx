import { InfiniteScroll } from "~/components/infinite-scroll";
import { Card, CardGrid } from "~/components/card";
import styles from "~/components/page.module.css";
import { AnimateSection, AnimateText } from "~/components/animate-text";

export const metadata = {
  title: "Projects",
  description: "The ever growing list of things I'm working on.",
};

export default function ProjectsPage() {
  return (
    <InfiniteScroll>
      <main>
        <Header />
        <CardGrid>
          <Card>1</Card>
          <Card>2</Card>
          <Card>3</Card>
          <Card>4</Card>
          <Card>5</Card>
          <Card>6</Card>
          <Card>7</Card>
          <Card>8</Card>
          <Card>9</Card>
          <Card>10</Card>
          <Card>11</Card>
          <Card>12</Card>
          <Card>13</Card>
          <Card>14</Card>
          <Card>15</Card>
          <Card>16</Card>
          <Card>17</Card>
          <Card>18</Card>
          <Card>19</Card>
          <Card>20</Card>
        </CardGrid>
        <Header aria-hidden />
      </main>
    </InfiniteScroll>
  );
}

const Header = (props: React.HTMLProps<HTMLDivElement>) => {
  return (
    <header className={styles.projectsHeaderSection} {...props}>
      <AnimateText
        className={styles.title}
        rotate={["code", "pixels", "limits"]}
      >
        Pushing
      </AnimateText>
      <AnimateSection as="p" className={styles.projectsDescription} delay={0.2}>
        A collection of my projects, past and present. Some built for today,
        some for tomorrow, but most for sitting in the incomplete pile.
      </AnimateSection>
      <AnimateSection as="p" className={styles.projectsComingSoon} delay={0.4}>
        Showreel coming soon.
      </AnimateSection>
    </header>
  );
};

/* <main className={styles.container}>
<header className={styles.header}>
  <AnimateText
    className={styles.title}
    rotate={["code", "pixels", "limits"]}
  >
    Pushing
  </AnimateText>
</header>
<AnimateSection as="p" delay={0.1}>
  The ever growing list of things I'm working on.
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
        <Link href="https://truffles.tv">Truffles</Link>
      </AnimateSection>
      <AnimateSection as="li" delay={0.5}>
        <Link href="https://uicapsule.com">UI Capsule</Link>
      </AnimateSection>
      <AnimateSection as="li" delay={0.55}>
        <Link href="https://tc.kyh.io">TC Calculator</Link>
      </AnimateSection>
      <AnimateSection as="li" delay={0.6}>
        <Link href="https://putcache.com">API Cache</Link>
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
</main> */
