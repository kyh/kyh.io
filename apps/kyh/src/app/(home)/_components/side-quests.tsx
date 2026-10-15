import type { ProjectAppItem } from "@/components/project-app-group";
import { projects } from "@/lib/data";
import type { SortableTile } from "./side-quests-grid";
import { SideQuestsGrid } from "./side-quests-grid";

const projectsAndVentures = projects.filter((p) => p.type === "project" || p.type === "venture");

const miniApps = projects.filter((p) => p.type === "mini-app");

const templates = projects.filter((p) => p.type === "template");

const toAppItem = (p: (typeof projects)[number]): ProjectAppItem => ({
  description: p.description,
  iconSrc: p.favicon,
  key: p.slug,
  name: p.title,
  url: p.url,
});

const tiles: SortableTile[] = [
  ...projectsAndVentures.map((p) => ({ app: toAppItem(p), key: p.slug, kind: "app" as const })),
  { items: miniApps.map(toAppItem), key: "group:mini-apps", kind: "group", title: "Mini Apps" },
  { items: templates.map(toAppItem), key: "group:templates", kind: "group", title: "Templates" },
];

export const SideQuests = () => <SideQuestsGrid tiles={tiles} />;
