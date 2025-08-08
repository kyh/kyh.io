import type { Metadata } from "next";

import { RadialTimeline } from "./components/source";

export const metadata: Metadata = {
  title: "Showcase",
  description: "The ever growing list of things I'm working on.",
};

const Page = () => (
  <main>
    <RadialTimeline />
  </main>
);

export default Page;
