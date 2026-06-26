import type { Metadata } from "next";

import { projects } from "@/lib/data";
import type { MediaTile } from "./_components/gallery";
import { Vortex } from "./_components/vortex";

export const metadata: Metadata = {
  title: "Showcase",
  description: "The ever growing list of things I'm working on.",
};

// Cap tiles per project so a single asset-heavy project can't dominate the vortex.
const MAX_TILES_PER_PROJECT = 3;

const filtered = projects.filter(
  (p) => p.type === "project" || p.type === "venture" || p.type === "mini-app",
);

const works = filtered.map((p) => ({
  title: p.title,
  description: p.description,
  url: p.url,
  favicon: p.favicon,
}));

// Real thumbnails only — image stills and video poster frames, no favicons/icons.
const tiles: MediaTile[] = filtered.flatMap((p, workIndex) =>
  p.projectAssets
    .filter((asset) => asset.type === "image" || asset.type === "video")
    .slice(0, MAX_TILES_PER_PROJECT)
    .map((asset) => ({
      media: { type: asset.type, src: asset.src },
      workIndex,
    })),
);

const Page = () => {
  return (
    <main>
      <Vortex works={works} tiles={tiles} />
    </main>
  );
};

export default Page;
