import { projects } from "@/lib/data";
import {
  ProjectApp,
  ProjectAppGroup,
  type ProjectAppItem,
} from "@/components/project-app-group";

const projectsAndVentures = projects.filter(
  (p) => p.type === "project" || p.type === "venture",
);

const miniApps = projects.filter((p) => p.type === "mini-app");

const templates = projects.filter((p) => p.type === "template");

const toAppItem = (p: (typeof projects)[number]): ProjectAppItem => ({
  key: p.slug,
  name: p.title,
  iconSrc: p.favicon,
  url: p.url,
});

export const SideQuests = () => (
  <div className="side-quests-grid">
    {projectsAndVentures.map((p) => (
      <ProjectApp
        key={p.slug}
        name={p.title}
        iconSrc={p.favicon}
        url={p.url}
      />
    ))}
    <ProjectAppGroup title="Mini Apps" items={miniApps.map(toAppItem)} />
    <ProjectAppGroup title="Templates" items={templates.map(toAppItem)} />
  </div>
);
