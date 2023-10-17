import { CardGrid } from "~/components/card";
import { AnimateSection, AnimateText } from "~/components/animate-text";

import { InfiniteScroll } from "./components/infinite-scroll";

import { PlaygroundCard } from "./components/cards/playground";
import { ArcCard } from "./components/cards/arc";
import { AmazonCard } from "./components/cards/amazon";
import { GoogleCard } from "./components/cards/google";
import { YoursSincerelyCard } from "./components/cards/yourssincerely";
import { InteligirCard } from "./components/cards/inteligir";
import { AtriumCard } from "./components/cards/atrium";
import { CardiogramCard } from "./components/cards/cardiogram";
import { FoundingCard } from "./components/cards/founding";
import { TwoUpCard } from "./components/cards/twoup";
import { TCCard } from "./components/cards/tc";
import { StokevilleCard } from "./components/cards/stonksville";
import { UICapsuleCard } from "./components/cards/uicapsule";
import { Covid19Card } from "./components/cards/covid-19";

import styles from "~/styles/page.module.css";

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
          <PlaygroundCard />
          <GoogleCard />
          <AmazonCard />
          <YoursSincerelyCard />
          <ArcCard />
          <AtriumCard />
          <CardiogramCard />
          <FoundingCard />
          <TwoUpCard />
          <TCCard />
          <InteligirCard />
          <UICapsuleCard />
          <StokevilleCard />
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
        gradientFade
      >
        Pushing
      </AnimateText>
      <AnimateSection as="p" className={styles.projectsDescription} delay={0.2}>
        A collection of my projects, past and present. Some built for today,
        some for tomorrow, and most for sitting in the incomplete pile.
      </AnimateSection>
      <AnimateSection as="p" className={styles.projectsComingSoon} delay={0.4}>
        Site in progress.
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
