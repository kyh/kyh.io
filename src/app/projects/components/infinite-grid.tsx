"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import styles from "./infinite-grid.module.css";

export type Node =
  | {
      id: number;
      type: "video";
      src: string;
      url: string;
      description?: string;
    }
  | {
      id: number;
      type: "image";
      src: string;
      url: string;
      dataBlur?: string;
      description?: string;
    }
  | {
      id: number;
      type: "react";
      url: string;
      src: React.ReactNode;
    };

type Position = {
  x: number;
  y: number;
};

type Velocity = {
  x: number;
  y: number;
};

type DragHandlers = {
  moving: boolean;
  dragging: boolean;
  draggedFromInitial: boolean;
  handleStart: (e: React.MouseEvent | React.TouchEvent) => void;
  handleMove: (e: React.MouseEvent | React.TouchEvent) => void;
  handleEnd: () => void;
  handleWheel: (e: React.WheelEvent) => void;
};

const DRAG_THRESHOLD = 5;

const useDrag = (
  onDrag: (deltaX: number, deltaY: number) => void,
): DragHandlers => {
  const [dragging, setDragging] = useState(false);
  const [draggedFromInitial, setDraggedFromInitial] = useState(false);
  const [moving, setMoving] = useState(false);
  const initialPositionRef = useRef<Position>({ x: 0, y: 0 });
  const lastPositionRef = useRef<Position>({ x: 0, y: 0 });
  const velocityRef = useRef<Velocity>({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  const updateVelocity = useCallback((xDelta: number, yDelta: number) => {
    const velocityMagnitude = Math.sqrt(xDelta * xDelta + yDelta * yDelta);
    if (velocityMagnitude > 0.1) {
      velocityRef.current = { x: xDelta * 0.2, y: yDelta * 0.2 };
      setMoving(true);
    } else {
      velocityRef.current = { x: 0, y: 0 };
      setMoving(false);
    }
  }, []);

  const checkDraggedFromInitial = useCallback((currentPosition: Position) => {
    const dx = currentPosition.x - initialPositionRef.current.x;
    const dy = currentPosition.y - initialPositionRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance >= DRAG_THRESHOLD) {
      setDraggedFromInitial(true);
    }
  }, []);

  const animate = useCallback(() => {
    const { x, y } = velocityRef.current;
    if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
      onDrag(x, y);
      velocityRef.current = { x: x * 0.95, y: y * 0.95 };
      setMoving(true);
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setMoving(false);
      velocityRef.current = { x: 0, y: 0 };
      animationRef.current = undefined;
    }
  }, [onDrag]);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const event = "touches" in e ? e.touches[0] : e;
    if (!event) return;
    const { clientX, clientY } = event;
    initialPositionRef.current = { x: clientX, y: clientY };
    lastPositionRef.current = { x: clientX, y: clientY };
    velocityRef.current = { x: 0, y: 0 };
    setDragging(true);
    setDraggedFromInitial(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  }, []);

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!dragging) return;
      const event = "touches" in e ? e.touches[0] : e;
      if (!event) return;
      const { clientX, clientY } = event;
      const xDelta = clientX - lastPositionRef.current.x;
      const yDelta = clientY - lastPositionRef.current.y;
      updateVelocity(xDelta, yDelta);
      checkDraggedFromInitial({ x: clientX, y: clientY });
      onDrag(xDelta, yDelta);
      lastPositionRef.current = { x: clientX, y: clientY };
    },
    [dragging, onDrag, updateVelocity, checkDraggedFromInitial],
  );

  const handleEnd = useCallback(() => {
    setDragging(false);
    setDraggedFromInitial(false);
    if (velocityRef.current.x !== 0 || velocityRef.current.y !== 0) {
      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    } else {
      setMoving(false);
    }
  }, [animate]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const xDelta = e.deltaX * 0.5;
      const yDelta = e.deltaY * 0.5;
      updateVelocity(xDelta, yDelta);
      onDrag(xDelta, yDelta);
      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    },
    [onDrag, updateVelocity, animate],
  );

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    moving,
    dragging,
    draggedFromInitial,
    handleStart,
    handleMove,
    handleEnd,
    handleWheel,
  };
};

type CardProps = {
  node: Node;
  x: number;
  y: number;
  width: number;
  height: number;
  disabled?: boolean;
};

const Card = ({ node, x, y, width, height, disabled }: CardProps) => {
  return (
    <a
      className={styles.card}
      style={{
        width,
        height,
        transform: `translate3d(${x}px, ${y}px, 0)`,
        pointerEvents: disabled ? "none" : undefined,
      }}
      href={node.url}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
    >
      {node.type === "image" && (
        <Image
          src={node.src}
          alt={node.description ?? ""}
          width={width}
          height={height}
          blurDataURL={node.dataBlur}
          placeholder="blur"
        />
      )}
      {node.type === "video" && (
        <video autoPlay muted loop>
          <source src={node.src} type="video/webm" />
          Unsupported.
        </video>
      )}
    </a>
  );
};

const NEIGHBOURS = [
  [0, -1],
  [0, 1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
] as const;

type InfiniteGridProps = {
  nodes: Node[];
  nodeWidth?: number;
  nodeHeight?: number;
  rows?: number;
  cols?: number;
  gap?: number;
};

export const InfiniteGrid = ({
  nodes,
  nodeWidth = 400,
  nodeHeight = 300,
  rows = 3,
  cols = 3,
  gap = 20,
}: InfiniteGridProps) => {
  const [viewportX, setViewportX] = useState(-gap);
  const [viewportY, setViewportY] = useState(-gap);
  const [viewCols, setViewCols] = useState(0);
  const [viewRows, setViewRows] = useState(0);
  const [picks, setPicks] = useState<Record<string, Node>>({});
  const gridRef = useRef<HTMLDivElement>(null);

  const updateViewColRows = useCallback(() => {
    if (gridRef.current) {
      setViewCols(
        Math.ceil(gridRef.current.clientWidth / (nodeWidth + gap)) + 2,
      );
      setViewRows(
        Math.ceil(gridRef.current.clientHeight / (nodeHeight + gap)) + 2,
      );
    }
  }, [nodeWidth, nodeHeight, gap]);

  const getGalleryNode = useCallback(
    (index: number): Node => nodes[index % nodes.length]!,
    [nodes],
  );

  const getRandomSafe = useCallback(
    (col: number, row: number): Node => {
      let pick: Node | undefined;
      let tries = 0;
      while (pick === undefined && tries < 20) {
        const rnd = Math.floor(Math.random() * 10000);
        const item = getGalleryNode(rnd);
        if (
          NEIGHBOURS.every(
            ([dx, dy]) => picks[`${col + dx}:${row + dy}`] !== item,
          )
        ) {
          pick = item;
        }
        tries++;
      }
      return pick ?? getGalleryNode(Math.floor(Math.random() * nodes.length));
    },
    [getGalleryNode, picks],
  );

  const getRandomNode = useCallback(
    (col: number, row: number): Node => {
      const key = `${col}:${row}`;
      if (!picks[key]) {
        setPicks((prev) => ({ ...prev, [key]: getRandomSafe(col, row) }));
      }
      return picks[key]!;
    },
    [getRandomSafe, picks],
  );

  const onDrag = useCallback((deltaX: number, deltaY: number) => {
    setViewportX((prev) => prev - deltaX);
    setViewportY((prev) => prev - deltaY);
  }, []);

  const {
    moving,
    draggedFromInitial,
    handleStart,
    handleMove,
    handleEnd,
    handleWheel,
  } = useDrag(onDrag);

  useEffect(() => {
    updateViewColRows();

    window.addEventListener("resize", updateViewColRows);
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";

    return () => {
      window.removeEventListener("resize", updateViewColRows);
      document.documentElement.style.overscrollBehavior = "";
      document.body.style.overscrollBehavior = "";
    };
  }, [updateViewColRows]);

  const renderCards = () => {
    const cards: JSX.Element[] = [];
    const startCol = Math.floor(viewportX / (nodeWidth + gap));
    const startRow = Math.floor(viewportY / (nodeHeight + gap));

    for (let row = 0; row < viewRows; row++) {
      for (let col = 0; col < viewCols; col++) {
        const tCol = startCol + col;
        const tRow = startRow + row;
        let node: Node;

        if (tCol >= 0 && tRow >= 0 && tCol < cols && tRow < rows) {
          const index = tRow * cols + tCol;
          node = getGalleryNode(index);
        } else {
          node = getRandomNode(tCol, tRow);
        }

        const x = tCol * (nodeWidth + gap);
        const y = tRow * (nodeHeight + gap);

        cards.push(
          <Card
            key={`${tCol}:${tRow}`}
            node={node}
            x={x}
            y={y}
            width={nodeWidth}
            height={nodeHeight}
            disabled={moving || draggedFromInitial}
          />,
        );
      }
    }
    return cards;
  };

  return (
    <div
      ref={gridRef}
      className={styles.grid}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onWheel={handleWheel}
    >
      <div
        style={{
          transform: `translate3d(${-viewportX}px, ${-viewportY}px, 0)`,
          willChange: "transform",
        }}
      >
        {renderCards()}
      </div>
    </div>
  );
};
