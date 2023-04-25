import { InfiniteScroll } from "~/components/infinite-scroll";
import { CardGrid } from "~/components/card";
import { AnimateSection, AnimateText } from "~/components/animate-text";

import { ArcCard } from "./cards/arc";
import { AmazonCard } from "./cards/amazon";
import { GoogleCard } from "./cards/google";
import { YoursSincerelyCard } from "./cards/yourssincerely";
import { InteligirCard } from "./cards/inteligir";
import { AtriumCard } from "./cards/atrium";
import { CardiogramCard } from "./cards/cardiogram";
import { FoundingCard } from "./cards/founding";
import { TrufflesCard } from "./cards/truffles";
import { TCCard } from "./cards/tc";
import { KeikoCard } from "./cards/keiko";
import { UICapsuleCard } from "./cards/uicapsule";
import { SlyceCard } from "./cards/slyce";
import { Covid19Card } from "./cards/covid-19";

import styles from "~/components/page.module.css";

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
          <ArcCard />
          <GoogleCard />
          <AmazonCard />
          <YoursSincerelyCard />
          <InteligirCard />
          <AtriumCard />
          <CardiogramCard />
          <FoundingCard />
          <TrufflesCard />
          <TCCard />
          <KeikoCard />
          <UICapsuleCard />
          <SlyceCard />
          <Covid19Card />
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
        some for tomorrow, and most for sitting in the incomplete pile.
      </AnimateSection>
      <AnimateSection as="p" className={styles.projectsComingSoon} delay={0.4}>
        Showreel coming soon.
      </AnimateSection>
      <ScrollArrow />
    </header>
  );
};

const ScrollArrow = () => {
  return (
    <div className={styles.scrollArrowContainer}>
      <div className={styles.scrollArrow} />
      <div className={styles.scrollArrow} />
      <div className={styles.scrollArrow} />
    </div>
  );
};
