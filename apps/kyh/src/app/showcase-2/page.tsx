import type { Metadata } from "next";

import { GravityWall } from "./_components/gravity-wall";
import { PHOTOS } from "./_components/photos";

export const metadata: Metadata = {
  title: "Showcase",
  description: "The ever growing list of things I'm working on.",
};

const Page = () => {
  return (
    <main className="fixed inset-0">
      <GravityWall photos={PHOTOS} />
    </main>
  );
};

export default Page;
