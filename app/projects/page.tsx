import { CardGrid } from "~/components/card";

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
    <main className={styles.projectsContainer}>
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
    </main>
  );
}
