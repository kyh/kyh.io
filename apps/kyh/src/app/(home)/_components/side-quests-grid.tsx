"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useDragControls } from "motion/react";

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
  /** Changes only with a drag, so restoring the saved order on load doesn't animate. */
  layoutDependency: unknown;
  registerRef: (key: string, el: HTMLDivElement | null) => void;
  onLongPress: () => void;
  onDragOver: (key: string, x: number, y: number) => void;
  lockScroll: (locked: boolean) => void;
}

const Tile = ({
  tile,
  index,
  editing,
  layoutDependency,
  registerRef,
  onLongPress,
  onDragOver,
  lockScroll,
}: TileProps) => {
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

  const setRef = useCallback(
    (el: HTMLDivElement | null) => registerRef(tile.key, el),
    [registerRef, tile.key],
  );

  return (
    <motion.div
      ref={setRef}
      className="relative touch-manipulation select-none [-webkit-touch-callout:none]"
      data-slot="tile"
      data-editing={editing || undefined}
      data-dragging={dragging || undefined}
      layout="position"
      layoutDependency={layoutDependency}
      transition={layoutSpring}
      drag
      dragControls={controls}
      dragListener={false}
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.12, zIndex: 10 }}
      style={{ zIndex: dragging ? 10 : undefined }}
      onDragStart={() => setDragging(true)}
      onDrag={(e) => {
        if ("clientX" in e) {
          onDragOver(tile.key, e.clientX, e.clientY);
        }
      }}
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
    </motion.div>
  );
};

export const SideQuestsGrid = ({ tiles }: { tiles: SortableTile[] }) => {
  const hydrated = useIsHydrated();
  // Null until the first drag: the saved order (client only) or the page's.
  const [moved, setMoved] = useState<string[] | null>(null);
  const [editing, setEditing] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollLocked = useRef(false);

  const keys = useMemo(() => tiles.map((t) => t.key), [tiles]);
  const byKey = useMemo(() => new Map(tiles.map((t) => [t.key, t])), [tiles]);
  const order = moved ?? (hydrated ? readOrder(keys) : keys);

  useEffect(() => {
    if (moved) {
      writeOrder(moved);
    }
  }, [moved]);

  const registerRef = useCallback((key: string, el: HTMLDivElement | null) => {
    tileRefs.current[key] = el;
  }, []);

  const lockScroll = useCallback((locked: boolean) => {
    scrollLocked.current = locked;
  }, []);

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

  const handleDragOver = useCallback(
    (dragged: string, x: number, y: number) => {
      const target = Object.entries(tileRefs.current).find(([key, el]) => {
        if (key === dragged || !el) {
          return false;
        }
        const r = el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      })?.[0];
      if (!target) {
        return;
      }
      setMoved((current) => {
        const prev = current ?? readOrder(keys);
        const from = prev.indexOf(dragged);
        const to = prev.indexOf(target);
        if (from === -1 || to === -1) {
          return prev;
        }
        const next = [...prev];
        next.splice(from, 1);
        next.splice(to, 0, dragged);
        return next;
      });
    },
    [keys],
  );

  return (
    <div ref={gridRef} className="side-quests-grid">
      {order.map((key, index) => {
        const tile = byKey.get(key);
        return tile ? (
          <Tile
            key={key}
            tile={tile}
            index={index}
            editing={editing}
            layoutDependency={moved}
            registerRef={registerRef}
            onLongPress={() => setEditing(true)}
            onDragOver={handleDragOver}
            lockScroll={lockScroll}
          />
        ) : null;
      })}
    </div>
  );
};
