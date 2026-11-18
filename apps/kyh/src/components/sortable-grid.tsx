"use client";

import type { PointerEvent as ReactPointerEvent, ReactNode, SyntheticEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "motion/react";

const longPressMs = 500;
const moveTolerance = 8;
const layoutSpring = { damping: 30, stiffness: 400, type: "spring" } as const;
const settleTransition = { ...layoutSpring, layout: { duration: 0 } };

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

const wiggleStyle = (index: number) =>
  ({
    "--wiggle-delay": `${-((index * 0.07) % 0.28)}s`,
    "--wiggle-dir": index % 2 === 0 ? 1 : -1,
  }) as React.CSSProperties;

const isOwn = (e: SyntheticEvent<HTMLElement>) =>
  e.target instanceof Node && e.currentTarget.contains(e.target);

interface TileProps {
  value: string;
  index: number;
  editing: boolean;
  settling: boolean;
  onLongPress: () => void;
  onHold: (holding: boolean) => void;
  children: ReactNode;
}

const Tile = ({ value, index, editing, settling, onLongPress, onHold, children }: TileProps) => {
  const controls = useDragControls();
  const press = useRef<AbortController | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => press.current?.abort(), []);

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
      grab();
    }, longPressMs);
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
  const [moving, setMoving] = useState<string[] | null>(null);
  const latest = useRef<string[] | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollLocked = useRef(false);
  const holds = useRef(0);

  const byKey = new Map(items.map((item) => [keyOf(item), item]));
  const order = moving ?? items.map(keyOf);

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
