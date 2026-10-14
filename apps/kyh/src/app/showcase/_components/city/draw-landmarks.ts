// Which building stands for which project, and where it likes to stand.
// A project missing here still gets a building: a generic one for its kind,
// with its name on it, on the nearest free lot.
import type { Bounds, DrawLandmark } from "./landmark";
import type { CityPlan, Lot, LotSize, PlanEntry } from "./plan";
import type { Sketch } from "./sketch";
import { CURB_TOP } from "./draw-blocks";
import { drawFounding, drawUiCapsule, drawVibedgames, drawYoursSincerely } from "./landmarks-large";
import {
  drawClawders,
  drawDataembed,
  drawEdgestories,
  drawInit,
  drawInteligir,
} from "./landmarks-outskirts";
import {
  drawAutoplay,
  drawBank,
  drawClinic,
  drawGenericLot,
  drawKwadrants,
  drawPrintShop,
  drawStickerShop,
  drawStonksville,
  drawTemplateHouse,
  drawWatchHouse,
} from "./landmarks-small";
import { hashString } from "./random";

export type ProjectKind = "venture" | "project" | "mini-app" | "template";

/** What the city needs to know about a project. */
export interface CityProject {
  slug: string;
  title: string;
  description: string;
  url: string;
  kind: ProjectKind;
  favicon: string;
  media: { src: string; type: "image" | "video" } | null;
}

interface Landmark {
  size: LotSize;
  home?: string;
  draw: DrawLandmark;
}

const LANDMARKS = new Map<string, Landmark>([
  ["founding", { draw: drawFounding, home: "4,4", size: "large" }],
  ["vibedgames", { draw: drawVibedgames, home: "3,4", size: "large" }],
  ["yourssincerely", { draw: drawYoursSincerely, home: "5,3", size: "large" }],
  ["uicapsule", { draw: drawUiCapsule, home: "5,5", size: "large" }],
  ["inteligir", { draw: drawInteligir, home: "4,3", size: "large" }],
  ["dataembed", { draw: drawDataembed, home: "2,6", size: "large" }],
  ["edgestories", { draw: drawEdgestories, home: "2,4", size: "large" }],
  ["clawders", { draw: drawClawders, home: "7,2", size: "large" }],
  ["init", { draw: drawInit, home: "launch", size: "launch" }],
  ["stonksville", { draw: drawStonksville, home: "6,5:front", size: "half" }],
  ["autoplay", { draw: drawAutoplay, home: "6,5:back", size: "half" }],
  ["total-compensation-calculator", { draw: drawBank, home: "3,6:back", size: "half" }],
  ["covid-19-dashboard", { draw: drawClinic, home: "3,6:front", size: "half" }],
  ["policing-ice", { draw: drawWatchHouse, home: "6,3:back", size: "half" }],
  ["kwadrants", { draw: drawKwadrants, home: "6,3:front", size: "half" }],
  ["keiko-and-friends", { draw: drawStickerShop, home: "6,4:sw", size: "quarter" }],
  ["loremllm", { draw: drawPrintShop, home: "6,4:se", size: "quarter" }],
]);

const SIZE_BY_KIND: Record<ProjectKind, LotSize> = {
  "mini-app": "quarter",
  project: "large",
  template: "template",
  venture: "large",
};

export const planEntries = (projects: readonly CityProject[]): PlanEntry[] =>
  projects.map((project) => {
    const landmark = LANDMARKS.get(project.slug);
    return {
      home: landmark?.home,
      size: landmark?.size ?? SIZE_BY_KIND[project.kind],
      slug: project.slug,
    };
  });

/** A project's building, standing on its lot. */
export interface Placed {
  project: CityProject;
  lot: Lot;
  bounds: Bounds;
}

export const drawLots = (sketch: Sketch, plan: CityPlan, projects: readonly CityProject[]) => {
  const bySlug = new Map(projects.map((project) => [project.slug, project]));
  const placed: Placed[] = [];
  for (const lot of plan.lots) {
    const site = { ...lot, y: lot.size === "launch" ? 0 : CURB_TOP };
    const project = bySlug.get(lot.slug);
    if (project) {
      const draw = LANDMARKS.get(project.slug)?.draw;
      const bounds = draw
        ? draw(sketch, site, project.title)
        : drawGenericLot(sketch, site, lot.size, project.title, hashString(project.slug));
      placed.push({ bounds, lot, project });
    } else if (lot.size === "template") {
      drawTemplateHouse(sketch, site, "");
    } else if (lot.size !== "launch") {
      drawGenericLot(sketch, site, lot.size, "", hashString(`${lot.x}:${lot.z}`));
    }
  }
  return placed;
};
