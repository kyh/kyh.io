import type { Metadata } from "next";

import { projects } from "@/lib/data";
import { WorkWall } from "./_components/work-wall";
import { buildWorkSeeds } from "./_components/works";

export const metadata: Metadata = {
  description: "The ever growing list of things I'm working on.",
  title: "Showcase",
};

const seeds = buildWorkSeeds(projects);

const Page = () => (
  <main>
    <WorkWall seeds={seeds} />
  </main>
);

export default Page;
