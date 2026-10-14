import type { Metadata } from "next";

import type { CityProject } from "./_components/city/draw-landmarks";
import { projects } from "@/lib/data";
import { CityShowcase } from "./_components/city-showcase";

export const metadata: Metadata = {
  alternates: { canonical: "/showcase" },
  description: "The ever growing list of things I'm working on.",
  title: "Showcase",
};

const cityProjects: CityProject[] = projects.map((project) => {
  const [asset] = project.projectAssets;
  return {
    description: project.description,
    favicon: project.favicon,
    kind: project.type,
    media: asset ? { src: asset.src, type: asset.type } : null,
    slug: project.slug,
    title: project.title,
    url: project.url,
  };
});

const Page = () => (
  <main>
    <CityShowcase projects={cityProjects} />
    {/* The city is drawn on a canvas; this is the same list for readers and
        crawlers. Keyboards get there through the directory instead. */}
    <ul className="sr-only">
      {cityProjects.map((project) => (
        <li key={project.slug}>
          <a href={project.url} tabIndex={-1}>
            {project.title}
          </a>
          : {project.description}
        </li>
      ))}
    </ul>
  </main>
);

export default Page;
