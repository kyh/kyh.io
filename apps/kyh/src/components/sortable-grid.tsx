"use client";

import type { PointerEvent as ReactPointerEvent, ReactNode, SyntheticEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "motion/react";

import { useIsHydrated } from "@/lib/use-hydrated";

// An iOS-style home screen: long-press a tile and the grid wiggles, drag to
// reorder (motion's Reorder in `xy`), press anywhere else or Escape to stop.

const longPressMs = 500;
const moveTolerance = 8;
const layoutSpring = { damping: 30, stiffness: 400, type: "spring" } as const;
// Layout moves are instant until the first reorder, so restoring the saved order on load doesn't spring.
const restoreTransition = { ...layoutSpring, layout: { duration: 0 } };

/** Saved keys still on the page, in their saved order, then any tile the save doesn't know. */
const readOrder = (storageKey: string, keys: string[]) => {
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

const writeOrder = (storageKey: string, order: string[]) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(order));
  } catch {
    // Storage blocked: the order lasts until reload.
  }
};

/** The visitor's order for `keys`, kept in localStorage under `storageKey`. */
export const useStoredOrder = (storageKey: string, keys: string[]) => {
  const hydrated = useIsHydrated();
  // Null until the first reorder: the saved order (client only) or the page's.
  const [moved, setMoved] = useState<string[] | null>(null);
  const order = moved ?? (hydrated ? readOrder(storageKey, keys) : keys);

  useEffect(() => {
    if (moved) {
      writeOrder(storageKey, moved);
    }
  }, [storageKey, moved]);

  return { order, reordered: moved !== null, setOrder: setMoved };
};

/** Editing (wiggling) until a press lands outside every tile, or Escape. */
export const useEditMode = () => {
  const [editing, setEditing] = useState(false);

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

  return [editing, setEditing] as const;
};

// SAFETY: CSS custom properties are valid inline styles, but React.CSSProperties
// has no index signature for `--*` keys; the object holds nothing else.
const wiggleStyle = (index: number) =>
  ({
    "--wiggle-delay": `${-((index * 0.07) % 0.28)}s`,
    "--wiggle-dir": index % 2 === 0 ? 1 : -1,
  }) as React.CSSProperties;

/** React bubbles events out of portals (an open folder) to their React parents; a tile only answers its own DOM. */
const isOwn = (e: SyntheticEvent<HTMLElement>) =>
  e.target instanceof Node && e.currentTarget.contains(e.target);

interface TileProps {
  value: string;
  index: number;
  editing: boolean;
  reordered: boolean;
  onLongPress: () => void;
  lockScroll: (locked: boolean) => void;
  children: ReactNode;
}

const Tile = ({
  value,
  index,
  editing,
  reordered,
  onLongPress,
  lockScroll,
  children,
}: TileProps) => {
  const controls = useDragControls();
  const press = useRef<{ stop: () => void } | null>(null);
  const [dragging, setDragging] = useState(false);

  const cancelPress = () => {
    press.current?.stop();
    press.current = null;
  };

  useEffect(() => () => press.current?.stop(), []);

  // Drag starts from a long press (or any press once editing), so the item
  // ignores its own pointer and the press hands the gesture to dragControls.
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !isOwn(e)) {
      return;
    }
    const event = e.nativeEvent;
    // The press is followed on the window: the pointer may leave the tile before it lifts.
    const onUp = () => {
      cancelPress();
      lockScroll(false);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    if (editing) {
      lockScroll(true);
      controls.start(event);
      return;
    }
    cancelPress();
    const onMove = (m: PointerEvent) => {
      if (Math.hypot(m.clientX - event.clientX, m.clientY - event.clientY) > moveTolerance) {
        cancelPress();
      }
    };
    const timer = window.setTimeout(() => {
      cancelPress();
      lockScroll(true);
      onLongPress();
      // Same press carries on into a drag, as on a home screen.
      controls.start(event);
    }, longPressMs);
    window.addEventListener("pointermove", onMove);
    press.current = {
      stop: () => {
        clearTimeout(timer);
        window.removeEventListener("pointermove", onMove);
      },
    };
  };

  return (
    <Reorder.Item
      as="div"
      value={value}
      className="relative touch-manipulation select-none [-webkit-touch-callout:none]"
      data-slot="tile"
      data-editing={editing || undefined}
      data-dragging={dragging || undefined}
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      whileDrag={{ scale: 1.12 }}
      transition={reordered ? layoutSpring : restoreTransition}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      onPointerDown={handlePointerDown}
      onClickCapture={(e) => {
        // Editing: icons don't open; the press that started editing doesn't either.
        if (editing && isOwn(e)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onContextMenu={(e) => {
        if ((editing || press.current) && isOwn(e)) {
          e.preventDefault();
        }
      }}
    >
      <div data-slot="tile-wiggle" style={wiggleStyle(index)}>
        {children}
      </div>
    </Reorder.Item>
  );
};

interface SortableGridProps {
  order: string[];
  reordered: boolean;
  onReorder: (order: string[]) => void;
  editing: boolean;
  onEdit: () => void;
  className?: string;
  renderTile: (key: string, index: number) => ReactNode;
}

export const SortableGrid = ({
  order,
  reordered,
  onReorder,
  editing,
  onEdit,
  className,
  renderTile,
}: SortableGridProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollLocked = useRef(false);

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

  const lockScroll = (locked: boolean) => {
    scrollLocked.current = locked;
  };

  return (
    <Reorder.Group
      as="div"
      ref={gridRef}
      axis="xy"
      values={order}
      onReorder={onReorder}
      className={className}
    >
      {order.map((key, index) => (
        <Tile
          key={key}
          value={key}
          index={index}
          editing={editing}
          reordered={reordered}
          onLongPress={onEdit}
          lockScroll={lockScroll}
        >
          {renderTile(key, index)}
        </Tile>
      ))}
    </Reorder.Group>
  );
};
