import type { Metadata } from "next";

import { projects } from "@/lib/data";
import { Radial } from "./components/radial";

export const metadata: Metadata = {
  title: "Showcase",
  description: "The ever growing list of things I'm working on.",
};

const Page = () => (
  <main>
    <Radial projects={projects} />
  </main>
);

export default Page;
