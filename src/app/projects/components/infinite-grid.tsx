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
  dragging: boolean;
  handleStart: (e: React.MouseEvent | React.TouchEvent) => void;
  handleMove: (e: React.MouseEvent | React.TouchEvent) => void;
  handleEnd: () => void;
  handleWheel: (e: React.WheelEvent) => void;
};

const useDrag = (
  onDrag: (deltaX: number, deltaY: number) => void,
): DragHandlers => {
  const [dragging, setDragging] = useState<boolean>(false);
  const [lastPosition, setLastPosition] = useState<Position>({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState<Velocity>({ x: 0, y: 0 });

  const updateVelocity = useCallback((xDelta: number, yDelta: number) => {
    const velocityMagnitude = Math.abs(xDelta * yDelta);
    if (velocityMagnitude > 50) {
      setVelocity({ x: xDelta * 0.5, y: yDelta * 0.5 });
    }
  }, []);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const event = "touches" in e ? e.touches[0] : e;
    if (!event) return;
    const { clientX, clientY } = event;
    setLastPosition({ x: clientX, y: clientY });
    setDragging(true);
  }, []);

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!dragging) return;
      const event = "touches" in e ? e.touches[0] : e;
      if (!event) return;
      const { clientX, clientY } = event;
      const xDelta = clientX - lastPosition.x;
      const yDelta = clientY - lastPosition.y;
      updateVelocity(xDelta, yDelta);
      onDrag(xDelta, yDelta);
      setLastPosition({ x: clientX, y: clientY });
    },
    [dragging, lastPosition, onDrag, updateVelocity],
  );

  const handleEnd = useCallback(() => {
    setDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const xDelta = e.deltaX * 0.5;
      const yDelta = e.deltaY * 0.5;
      updateVelocity(xDelta, yDelta);
      onDrag(xDelta, yDelta);
    },
    [onDrag, updateVelocity],
  );

  useEffect(() => {
    let animationId: number;
    const animate = () => {
      onDrag(velocity.x, velocity.y);
      setVelocity((prev) => ({
        x: prev.x * 0.95,
        y: prev.y * 0.95,
      }));
      if (Math.abs(velocity.x) > 0.5 || Math.abs(velocity.y) > 0.5) {
        animationId = requestAnimationFrame(animate);
      }
    };
    if (velocity.x !== 0 || velocity.y !== 0) {
      animationId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationId);
  }, [velocity, onDrag]);

  return {
    dragging,
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
  dragging?: boolean;
};

const Card = ({ node, x, y, width, height, dragging }: CardProps) => {
  return (
    <a
      className={styles.card}
      style={{
        width,
        height,
        transform: `translate3d(${x}px, ${y}px, 0)`,
      }}
      href={node.url}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      onClick={(e) => {
        console.log("mouse up", dragging);
        e.preventDefault();
      }}
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
  const [viewportX, setViewportX] = useState<number>(-gap);
  const [viewportY, setViewportY] = useState<number>(-gap);
  const [viewCols, setViewCols] = useState<number>(0);
  const [viewRows, setViewRows] = useState<number>(0);
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

  const { dragging, handleStart, handleMove, handleEnd, handleWheel } =
    useDrag(onDrag);

  useEffect(() => {
    updateViewColRows();
    window.addEventListener("resize", updateViewColRows);
    return () => window.removeEventListener("resize", updateViewColRows);
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
            dragging={dragging}
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
