"use client";

import { useMemo, useState } from "react";

import type { ProjectAppItem } from "@/components/project-app-group";
import { ProjectApp, ProjectAppGroup } from "@/components/project-app-group";
import { SortableGrid, useEditMode } from "@/components/sortable-grid";

export type SortableTile =
  | { key: string; kind: "app"; app: ProjectAppItem }
  | { key: string; kind: "group"; title: string; items: ProjectAppItem[] };

export const SideQuestsGrid = ({ tiles }: { tiles: SortableTile[] }) => {
  const byKey = useMemo(() => new Map(tiles.map((t) => [t.key, t])), [tiles]);
  const [order, setOrder] = useState(() => tiles.map((t) => t.key));
  const [editing, setEditing] = useEditMode();

  return (
    <SortableGrid
      order={order}
      onReorder={setOrder}
      editing={editing}
      onEdit={() => setEditing(true)}
      className="side-quests-grid"
      renderTile={(key) => {
        const tile = byKey.get(key);
        if (!tile) {
          return null;
        }
        return tile.kind === "app" ? (
          <ProjectApp
            name={tile.app.name}
            description={tile.app.description}
            iconSrc={tile.app.iconSrc}
            url={tile.app.url}
          />
        ) : (
          <ProjectAppGroup title={tile.title} items={tile.items} />
        );
      }}
    />
  );
};
