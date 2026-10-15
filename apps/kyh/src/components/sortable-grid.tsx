"use client";

import type { PointerEvent as ReactPointerEvent, ReactNode, SyntheticEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "motion/react";

// An iOS-style home screen: long-press a tile and the grid wiggles, drag to
// reorder (motion's Reorder in `xy`), press anywhere else or Escape to stop.
// The grid owns the gesture: it shows its own order while a tile is held and
// hands the result to `onDrop` once, when the tile is let go.

const longPressMs = 500;
const moveTolerance = 8;
const layoutSpring = { damping: 30, stiffness: 400, type: "spring" } as const;
/** Moves that aren't anyone's drop (an order arriving with the page) land in place. */
const settleTransition = { ...layoutSpring, layout: { duration: 0 } };

/** Editing (wiggling) until a press lands outside every tile, or Escape. */
const useEditMode = () => {
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

/**
 * A folder's grid sits inside a tile of the grid around it, in a portal, and
 * React bubbles portal events to their React parents: a tile only answers
 * events from its own DOM, so pressing inside an open folder doesn't also
 * press the folder's tile.
 */
const isOwn = (e: SyntheticEvent<HTMLElement>) =>
  e.target instanceof Node && e.currentTarget.contains(e.target);

interface TileProps {
  value: string;
  index: number;
  editing: boolean;
  settling: boolean;
  onLongPress: () => void;
  /** Picked up (true) or let go (false). */
  onHold: (holding: boolean) => void;
  children: ReactNode;
}

const Tile = ({ value, index, editing, settling, onLongPress, onHold, children }: TileProps) => {
  const controls = useDragControls();
  // One press at a time; aborting it takes down its timer and window listeners.
  const press = useRef<AbortController | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => press.current?.abort(), []);

  // The tile ignores its own pointer (dragListener off): a long press, or any
  // press once editing, picks it up and hands the gesture to dragControls.
  // The press is followed on the window, since the pointer may leave the tile,
  // and only its own pointer counts: a second finger lifting doesn't end it.
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !isOwn(e)) {
      return;
    }
    press.current?.abort();
    const ac = new AbortController();
    press.current = ac;
    const { signal } = ac;
    const down = e.nativeEvent;
    const isThisPointer = (event: PointerEvent) => event.pointerId === down.pointerId;

    let held = false;
    let timer = 0;
    const grab = () => {
      held = true;
      onHold(true);
      controls.start(down);
    };
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      if (held) {
        onHold(false);
      }
    });
    const release = (event: PointerEvent) => {
      if (isThisPointer(event)) {
        ac.abort();
      }
    };
    window.addEventListener("pointerup", release, { signal });
    window.addEventListener("pointercancel", release, { signal });

    if (editing) {
      grab();
      return;
    }
    timer = window.setTimeout(() => {
      onLongPress();
      // Same press carries on into a drag, as on a home screen.
      grab();
    }, longPressMs);
    // Moving before the long press fires is a scroll or a swipe, not a pick-up.
    window.addEventListener(
      "pointermove",
      (event) => {
        const moved = Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY);
        if (isThisPointer(event) && !held && moved > moveTolerance) {
          clearTimeout(timer);
        }
      },
      { signal },
    );
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
      transition={settling ? settleTransition : layoutSpring}
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
        const pressing = press.current && !press.current.signal.aborted;
        if ((editing || pressing) && isOwn(e)) {
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

interface SortableGridProps<T> {
  items: T[];
  keyOf: (item: T) => string;
  renderTile: (item: T, index: number) => ReactNode;
  /** A tile was let go after moving: the new order, by key. */
  onDrop: (order: string[]) => void;
  /** The first tile was picked up (true), or the last let go (false). */
  onHold?: (holding: boolean) => void;
  /** Lay out a new `items` order without animating it. */
  settling?: boolean;
  className?: string;
}

export const SortableGrid = <T,>({
  items,
  keyOf,
  renderTile,
  onDrop,
  onHold,
  settling = false,
  className,
}: SortableGridProps<T>) => {
  const [editing, setEditing] = useEditMode();
  // The order mid-gesture, until the tile is let go and it becomes `items`.
  const [moving, setMoving] = useState<string[] | null>(null);
  const latest = useRef<string[] | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollLocked = useRef(false);
  // Tiles held right now: with two fingers, the grid is let go with the last.
  const holds = useRef(0);

  const byKey = new Map(items.map((item) => [keyOf(item), item]));
  const order = moving ?? items.map(keyOf);

  // A finger holding a tile drags it, not the page.
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

  const reorder = (next: string[]) => {
    latest.current = next;
    setMoving(next);
  };

  const hold = (holding: boolean) => {
    holds.current = Math.max(0, holds.current + (holding ? 1 : -1));
    if (holding ? holds.current > 1 : holds.current > 0) {
      return;
    }
    scrollLocked.current = holding;
    onHold?.(holding);
    const dropped = latest.current;
    if (holding || !dropped) {
      return;
    }
    latest.current = null;
    setMoving(null);
    onDrop(dropped);
  };

  return (
    <Reorder.Group
      as="div"
      ref={gridRef}
      axis="xy"
      values={order}
      onReorder={reorder}
      className={className}
    >
      {order.map((key, index) => {
        const item = byKey.get(key);
        return item === undefined ? null : (
          <Tile
            key={key}
            value={key}
            index={index}
            editing={editing}
            settling={settling}
            onLongPress={() => setEditing(true)}
            onHold={hold}
          >
            {renderTile(item, index)}
          </Tile>
        );
      })}
    </Reorder.Group>
  );
};
