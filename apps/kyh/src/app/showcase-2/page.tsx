import type { Metadata } from "next";

import { projects } from "@/lib/data";
import { WorkWall } from "./_components/work-wall";
import { buildWorkSeeds } from "./_components/works";

export const metadata: Metadata = {
  title: "Showcase",
  description: "The ever growing list of things I'm working on.",
  alternates: { canonical: "/showcase-2" },
};

const seeds = buildWorkSeeds(projects);

const Page = () => {
  return (
    <main>
      <WorkWall seeds={seeds} />
    </main>
  );
};

export default Page;
