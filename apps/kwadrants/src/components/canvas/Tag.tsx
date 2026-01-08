import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Group, Rect, Text, Circle } from "react-konva";
import type Konva from "konva";

// Measure text width using canvas 2D context
const measureText = (text: string, fontSize: number, fontFamily: string): number => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return text.length * fontSize * 0.6;
  ctx.font = `${fontSize}px ${fontFamily}`;
  return ctx.measureText(text).width;
};

interface TagProps {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  onDragEnd: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
}

export const Tag = ({
  id,
  text,
  x,
  y,
  color,
  onDragEnd,
  onRemove,
}: TagProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [isSettling, setIsSettling] = useState(true);
  const textRef = useRef<Konva.Text>(null);
  const lastPosRef = useRef({ x, y });
  const frameRef = useRef<number>(0);

  const textWidth = useMemo(
    () => measureText(text, 14, "system-ui, -apple-system, sans-serif"),
    [text]
  );

  // Settle animation on mount
  useEffect(() => {
    if (!isSettling) return;

    let frame = 0;
    const animate = () => {
      frame++;
      const t = frame / 20;

      if (t >= 1) {
        setScale(1);
        setRotation(0);
        setIsSettling(false);
        return;
      }

      // Ease out bounce
      const scaleValue = 1 + 0.1 * Math.cos(t * Math.PI * 2) * (1 - t);
      const rotValue = 4 * Math.sin(t * Math.PI * 3) * (1 - t);

      setScale(scaleValue);
      setRotation(rotValue);
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isSettling]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setIsSettling(false);
    setScale(1.15);
    cancelAnimationFrame(frameRef.current);
  }, []);

  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const dx = node.x() - lastPosRef.current.x;
    const dy = node.y() - lastPosRef.current.y;

    const speed = Math.sqrt(dx * dx + dy * dy);
    const tilt = Math.min(speed * 0.8, 8);

    // Tilt in direction of movement
    setRotation(dx !== 0 ? tilt * Math.sign(dx) : 0);

    lastPosRef.current = { x: node.x(), y: node.y() };
  }, []);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    setIsDragging(false);
    onDragEnd(id, e.target.x(), e.target.y());
    setIsSettling(true);
  }, [id, onDragEnd]);

  const paddingX = 12; // matches px-3
  const paddingY = 6;  // matches py-1.5
  const height = 14 + paddingY * 2; // font size + vertical padding
  const width = Math.max(textWidth + paddingX * 2, 60);

  return (
    <Group
      x={x}
      y={y}
      draggable
      rotation={rotation}
      scaleX={scale}
      scaleY={scale}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={color}
        cornerRadius={4}
        shadowBlur={isDragging ? 10 : 2}
        shadowOpacity={isDragging ? 0.25 : 0.1}
        shadowOffsetY={isDragging ? 4 : 1}
      />

      <Text
        ref={textRef}
        text={text}
        x={-width / 2 + paddingX}
        y={-7}
        fontSize={14}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="#ffffff"
      />

      {isHovered && !isDragging && (
        <Group
          x={width / 2 - 4}
          y={-height / 2 - 4}
          onClick={() => onRemove(id)}
          onTap={() => onRemove(id)}
        >
          <Circle radius={8} fill="#ef4444" />
          <Text
            text="×"
            x={-4}
            y={-6}
            fontSize={12}
            fontFamily="system-ui, sans-serif"
            fill="#ffffff"
            fontStyle="bold"
          />
        </Group>
      )}
    </Group>
  );
};
