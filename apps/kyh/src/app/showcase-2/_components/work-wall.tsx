"use client";

import * as stylex from "@stylexjs/stylex";

import type { FC } from "react";

import { GravityWall } from "./gravity-wall";
import { useWorkMedia } from "./use-work-media";
import type { WorkSeed } from "./works";

const styles = stylex.create({ overlay: { position: "fixed", inset: 0 } });

/* The deck resolves client-side (media must be measured and video posters
   captured before cells can pack), so the wall mounts once it's ready and
   plays its intro over the page background the container shows while loading. */
export const WorkWall: FC<{ seeds: WorkSeed[] }> = ({ seeds }) => {
  const media = useWorkMedia(seeds);
  return <div {...stylex.props(styles.overlay)}>{media && <GravityWall photos={media} />}</div>;
};
