"use client";

import type { PointerEvent as ReactPointerEvent, ReactNode, SyntheticEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "motion/react";

// An iOS-style home screen: long-press a tile and the grid wiggles, drag to
// reorder (motion's Reorder in `xy`), press anywhere else or Escape to stop.

const longPressMs = 500;
const moveTolerance = 8;
const layoutSpring = { damping: 30, stiffness: 400, type: "spring" } as const;

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
  onLongPress: () => void;
  onHold: (holding: boolean) => void;
  lockScroll: (locked: boolean) => void;
  children: ReactNode;
}

const Tile = ({ value, index, editing, onLongPress, onHold, lockScroll, children }: TileProps) => {
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
    // Only this press's pointer counts: a second finger lifting mustn't end it.
    // From the moment a tile is picked up until it's let go, it's held: still or moving.
    let holding = false;
    const grab = () => {
      holding = true;
      onHold(true);
      lockScroll(true);
      controls.start(event);
    };
    const onUp = (u: PointerEvent) => {
      if (u.pointerId !== event.pointerId) {
        return;
      }
      cancelPress();
      lockScroll(false);
      if (holding) {
        onHold(false);
      }
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    if (editing) {
      grab();
      return;
    }
    cancelPress();
    const onMove = (m: PointerEvent) => {
      if (
        m.pointerId === event.pointerId &&
        Math.hypot(m.clientX - event.clientX, m.clientY - event.clientY) > moveTolerance
      ) {
        cancelPress();
      }
    };
    const timer = window.setTimeout(() => {
      cancelPress();
      onLongPress();
      // Same press carries on into a drag, as on a home screen.
      grab();
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
      transition={layoutSpring}
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
  onReorder: (order: string[]) => void;
  editing: boolean;
  onEdit: () => void;
  /** Whether this visitor is holding a tile, still or dragging. */
  onHold: (holding: boolean) => void;
  className?: string;
  renderTile: (key: string, index: number) => ReactNode;
}

export const SortableGrid = ({
  order,
  onReorder,
  editing,
  onEdit,
  onHold,
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
          onLongPress={onEdit}
          onHold={onHold}
          lockScroll={lockScroll}
        >
          {renderTile(key, index)}
        </Tile>
      ))}
    </Reorder.Group>
  );
};
