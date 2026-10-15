"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Reorder, useDragControls } from "motion/react";

import type { ProjectAppItem } from "@/components/project-app-group";
import { ProjectApp, ProjectAppGroup } from "@/components/project-app-group";
import { useIsHydrated } from "@/lib/use-hydrated";

export type SortableTile =
  | { key: string; kind: "app"; app: ProjectAppItem }
  | { key: string; kind: "group"; title: string; items: ProjectAppItem[] };

const longPressMs = 500;
const moveTolerance = 8;
const storageKey = "kyh:side-quests-order";
const layoutSpring = { damping: 30, stiffness: 400, type: "spring" } as const;

/** Saved keys still on the page, in their saved order, then any tile the save doesn't know. */
const readOrder = (keys: string[]) => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (!Array.isArray(saved)) {
      return keys;
    }
    const kept = saved.filter((k): k is string => typeof k === "string" && keys.includes(k));
    return [...new Set([...kept, ...keys])];
  } catch {
    return keys;
  }
};

const writeOrder = (order: string[]) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(order));
  } catch {
    // Storage blocked: the order lasts until reload.
  }
};

// SAFETY: CSS custom properties are valid inline styles, but React.CSSProperties
// has no index signature for `--*` keys; the object holds nothing else.
const wiggleStyle = (index: number) =>
  ({
    "--wiggle-delay": `${-((index * 0.07) % 0.28)}s`,
    "--wiggle-dir": index % 2 === 0 ? 1 : -1,
  }) as React.CSSProperties;

interface TileProps {
  tile: SortableTile;
  index: number;
  editing: boolean;
  onLongPress: () => void;
  lockScroll: (locked: boolean) => void;
}

const Tile = ({ tile, index, editing, onLongPress, lockScroll }: TileProps) => {
  const controls = useDragControls();
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const cancelPress = () => {
    if (press.current) {
      clearTimeout(press.current.timer);
      press.current = null;
    }
  };

  useEffect(
    () => () => {
      if (press.current) {
        clearTimeout(press.current.timer);
      }
    },
    [],
  );

  // Drag starts from a long press (or any press once editing), so the item
  // ignores its own pointer and the press hands the gesture to dragControls.
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) {
      return;
    }
    const event = e.nativeEvent;
    if (editing) {
      lockScroll(true);
      controls.start(event);
      return;
    }
    cancelPress();
    press.current = {
      timer: window.setTimeout(() => {
        press.current = null;
        lockScroll(true);
        onLongPress();
        // Same press carries on into a drag, as on a home screen.
        controls.start(event);
      }, longPressMs),
      x: e.clientX,
      y: e.clientY,
    };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > moveTolerance) {
      cancelPress();
    }
  };

  const handlePointerEnd = () => {
    cancelPress();
    if (!dragging) {
      lockScroll(false);
    }
  };

  return (
    <Reorder.Item
      as="div"
      value={tile.key}
      className="relative touch-manipulation select-none [-webkit-touch-callout:none]"
      data-slot="tile"
      data-editing={editing || undefined}
      data-dragging={dragging || undefined}
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      whileDrag={{ scale: 1.12 }}
      transition={layoutSpring}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => {
        setDragging(false);
        lockScroll(false);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClickCapture={(e) => {
        // Editing: icons don't open; the press that started editing doesn't either.
        if (editing) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onContextMenu={(e) => {
        if (editing || press.current) {
          e.preventDefault();
        }
      }}
    >
      <div data-slot="tile-wiggle" style={wiggleStyle(index)}>
        {tile.kind === "app" ? (
          <ProjectApp
            name={tile.app.name}
            description={tile.app.description}
            iconSrc={tile.app.iconSrc}
            url={tile.app.url}
          />
        ) : (
          <ProjectAppGroup title={tile.title} items={tile.items} />
        )}
      </div>
    </Reorder.Item>
  );
};

export const SideQuestsGrid = ({ tiles }: { tiles: SortableTile[] }) => {
  const hydrated = useIsHydrated();
  // Null until the first reorder: the saved order (client only) or the page's.
  const [moved, setMoved] = useState<string[] | null>(null);
  const [editing, setEditing] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollLocked = useRef(false);

  const keys = useMemo(() => tiles.map((t) => t.key), [tiles]);
  const byKey = useMemo(() => new Map(tiles.map((t) => [t.key, t])), [tiles]);
  const order = moved ?? (hydrated ? readOrder(keys) : keys);

  useEffect(() => {
    if (moved) {
      writeOrder(moved);
    }
  }, [moved]);

  // A finger held on a tile drags it, not the page.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      return;
    }
    const onTouchMove = (e: TouchEvent) => {
      if (scrollLocked.current && e.cancelable) {
        e.preventDefault();
      }
    };
    grid.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => grid.removeEventListener("touchmove", onTouchMove);
  }, []);

  // Pressing anywhere but a tile, or Escape, ends editing.
  useEffect(() => {
    if (!editing) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest('[data-slot="tile"]')) {
        return;
      }
      setEditing(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditing(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [editing]);

  const lockScroll = (locked: boolean) => {
    scrollLocked.current = locked;
  };

  return (
    <Reorder.Group
      as="div"
      ref={gridRef}
      axis="xy"
      values={order}
      onReorder={setMoved}
      className="side-quests-grid"
    >
      {order.map((key, index) => {
        const tile = byKey.get(key);
        return tile ? (
          <Tile
            key={key}
            tile={tile}
            index={index}
            editing={editing}
            onLongPress={() => setEditing(true)}
            lockScroll={lockScroll}
          />
        ) : null;
      })}
    </Reorder.Group>
  );
};
