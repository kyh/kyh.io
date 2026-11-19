import type { ComponentType, LazyExoticComponent } from "react";
import { lazy } from "react";

import type { ThemeId } from ".";

type Follower = LazyExoticComponent<ComponentType>;

const follower = (load: () => Promise<{ Follower: ComponentType }>) =>
  lazy(async () => {
    const { Follower: loaded } = await load();

    return { default: loaded };
  });

export const FOLLOWERS: Record<ThemeId, Follower | null> = {
  christmas: follower(() => import("./christmas/follower")),
  classic: null,
  easter: follower(() => import("./easter/follower")),
  halloween: follower(() => import("./halloween/follower")),
  lunarNewYear: follower(() => import("./lunar-new-year/follower")),
  stPatricks: follower(() => import("./st-patricks/follower")),
  thanksgiving: follower(() => import("./thanksgiving/follower")),
  valentines: follower(() => import("./valentines/follower")),
};
