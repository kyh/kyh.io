import type { ProjectType } from "@/lib/data";

/* Cap tiles per project so a single asset-heavy project (uicapsule ships ~10
   clips) can't dominate the wall — cells sample the deck uniformly. */
const MAX_ASSETS_PER_PROJECT = 4;

/** One media asset lifted out of a project, carrying its parent's metadata.
 *  Serializable, so the server page can hand it to the client wall. */
export interface WorkSeed {
  slug: string;
  title: string;
  category: string;
  description: string;
  url: string;
  media: { type: "image" | "video"; src: string };
}

/** A resolved wall entry: measured aspect plus an image the cells can draw. */
export interface WorkMedia {
  slug: string;
  title: string;
  category: string;
  description: string;
  url: string;
  aspect: number;
  /** Image src for wall cells — the asset itself, or a captured poster frame. */
  thumbUrl: string;
  /** Set for video assets; the expanded featured card plays it. */
  videoUrl?: string;
}

export const buildWorkSeeds = (projects: ProjectType[]): WorkSeed[] =>
  projects
    .filter((p) => p.type === "project" || p.type === "venture" || p.type === "mini-app")
    .flatMap((p) =>
      p.projectAssets.slice(0, MAX_ASSETS_PER_PROJECT).map((asset, i) => ({
        slug: `${p.slug}-${i}`,
        title: p.title,
        category: p.type,
        description: p.description,
        url: p.url,
        media: { type: asset.type, src: asset.src },
      })),
    );
