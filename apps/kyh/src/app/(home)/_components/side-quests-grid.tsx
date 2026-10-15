"use client";

import { useMemo } from "react";

import type { ProjectAppItem } from "@/components/project-app-group";
import { ProjectApp, ProjectAppGroup } from "@/components/project-app-group";
import { SortableGrid, useEditMode, useStoredOrder } from "@/components/sortable-grid";

export type SortableTile =
  | { key: string; kind: "app"; app: ProjectAppItem }
  | { key: string; kind: "group"; title: string; items: ProjectAppItem[] };

export const SideQuestsGrid = ({ tiles }: { tiles: SortableTile[] }) => {
  const keys = useMemo(() => tiles.map((t) => t.key), [tiles]);
  const byKey = useMemo(() => new Map(tiles.map((t) => [t.key, t])), [tiles]);
  const { order, reordered, setOrder } = useStoredOrder("kyh:side-quests-order", keys);
  const [editing, setEditing] = useEditMode();

  return (
    <SortableGrid
      order={order}
      reordered={reordered}
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
