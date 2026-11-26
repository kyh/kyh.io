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
  christmas: follower(async () => await import("./christmas/follower")),
  classic: null,
  easter: follower(async () => await import("./easter/follower")),
  halloween: follower(async () => await import("./halloween/follower")),
  lunarNewYear: follower(async () => await import("./lunar-new-year/follower")),
  stPatricks: follower(async () => await import("./st-patricks/follower")),
  thanksgiving: follower(async () => await import("./thanksgiving/follower")),
  valentines: follower(async () => await import("./valentines/follower")),
};
