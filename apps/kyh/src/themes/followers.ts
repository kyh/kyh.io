// What follows the mouse about in each theme: every theme folder's
// `follower.tsx` (the ghost at Halloween, the turkey at Thanksgiving), keyed
// by theme so a new one won't compile without its entry, null for none. Each
// is lazy, its own chunk: a page loads only the current theme's, and only once
// a mouse is on it (`follower/index.tsx`), so a phone never loads one at all.
import type { ComponentType, LazyExoticComponent } from "react";
import { lazy } from "react";

import type { ThemeId } from ".";

type Follower = LazyExoticComponent<ComponentType>;

const follower = (load: () => Promise<{ Follower: ComponentType }>): Follower =>
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
