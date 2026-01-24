import type { Metadata } from "next";

import { projects } from "@/lib/data";
import { Radial } from "./_components/radial";

export const metadata: Metadata = {
  title: "Showcase",
  description: "The ever growing list of things I'm working on.",
};

const filteredProjects = projects.filter(
  (p) => p.type === "project" || p.type === "venture" || p.type === "mini-app",
);

const Page = () => {
  return (
    <main>
      <Radial projects={filteredProjects} />
    </main>
  );
};

export default Page;
