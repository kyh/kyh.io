import type { Metadata } from "next";

import type { CityProject } from "./_components/city/draw-landmarks";
import { projects } from "@/lib/data";
import { CityShowcase } from "./_components/city-showcase";

export const metadata: Metadata = {
  alternates: { canonical: "/showcase" },
  description: "Everything I've built, as a city you can fly over.",
  title: "Showcase",
};

const cityProjects: CityProject[] = projects.map((project) => ({
  color: project.color,
  description: project.description,
  favicon: project.favicon,
  kind: project.type,
  slug: project.slug,
  title: project.title,
  url: project.url,
}));

const Page = () => (
  <main>
    {/* The city is drawn on a canvas; each building's icon is a real link. */}
    <h1 className="sr-only">Showcase: a city of everything I&apos;ve built</h1>
    <CityShowcase projects={cityProjects} />
  </main>
);

export default Page;
