"use client";

import type { ProjectAppItem } from "@/components/project-app-group";
import { useSharedOrder } from "@/components/multiplayer/provider";
import { ProjectApp, ProjectAppGroup } from "@/components/project-app-group";
import { SortableGrid } from "@/components/sortable-grid";

export type SortableTile =
  | { key: string; kind: "app"; app: ProjectAppItem }
  | { key: string; kind: "group"; title: string; items: ProjectAppItem[] };

const tileKey = (tile: SortableTile) => tile.key;
const appKey = (app: ProjectAppItem) => app.key;

/** A folder whose apps are in the order everyone on the site has them in. */
const SharedFolder = ({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: ProjectAppItem[];
}) => {
  const shared = useSharedOrder(id, items, appKey);
  return (
    <ProjectAppGroup
      title={title}
      items={shared.items}
      onDrop={shared.handleDrop}
      onHold={shared.handleHold}
    />
  );
};

/** The side quests as an iOS home screen, its order shared by everyone on the site. */
export const SideQuestsGrid = ({ tiles }: { tiles: SortableTile[] }) => {
  const shared = useSharedOrder("side-quests", tiles, tileKey);
  return (
    <SortableGrid
      items={shared.items}
      keyOf={tileKey}
      onDrop={shared.handleDrop}
      onHold={shared.handleHold}
      settling={shared.settling}
      className="side-quests-grid"
      renderTile={(tile) =>
        tile.kind === "app" ? (
          <ProjectApp
            name={tile.app.name}
            description={tile.app.description}
            iconSrc={tile.app.iconSrc}
            url={tile.app.url}
          />
        ) : (
          <SharedFolder id={tile.key} title={tile.title} items={tile.items} />
        )
      }
    />
  );
};
