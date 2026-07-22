"use client";

import type { FC } from "react";

import { GravityWall } from "./gravity-wall";
import { useWorkMedia } from "./use-work-media";
import type { WorkSeed } from "./works";

/* The deck resolves client-side (media must be measured and video posters
   captured before cells can pack), so the wall mounts once it's ready and
   plays its intro from the same black the container shows while loading. */
export const WorkWall: FC<{ seeds: WorkSeed[] }> = ({ seeds }) => {
  const media = useWorkMedia(seeds);
  return (
    <div className="fixed inset-0 bg-[#0a0a0a]">{media && <GravityWall photos={media} />}</div>
  );
};
