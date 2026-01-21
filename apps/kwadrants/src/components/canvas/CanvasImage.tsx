import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Group, Image, Text } from "react-konva";

interface CanvasImageProps {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  onDragEnd: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
}

export const CanvasImage = ({
  id,
  src,
  x,
  y,
  width,
  height,
  onDragEnd,
  onRemove,
}: CanvasImageProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isSettling, setIsSettling] = useState(true);
  const lastPosRef = useRef({ x, y });
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => setImage(img);
  }, [src]);

  // Settle animation
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
    setScale(1.05);
    cancelAnimationFrame(frameRef.current);
  }, []);

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const dx = node.x() - lastPosRef.current.x;
      const speed = Math.sqrt(dx * dx);
      const tilt = Math.min(speed * 0.5, 6);

      setRotation(dx !== 0 ? tilt * Math.sign(dx) : rotation * 0.9);
      lastPosRef.current = { x: node.x(), y: node.y() };
    },
    [rotation],
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      setIsDragging(false);
      onDragEnd(id, e.target.x(), e.target.y());
      setIsSettling(true);
    },
    [id, onDragEnd],
  );

  if (!image) return null;

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
      <Image
        image={image}
        width={width}
        height={height}
        offsetX={width / 2}
        offsetY={height / 2}
        cornerRadius={4}
        shadowBlur={isDragging ? 12 : 4}
        shadowOpacity={isDragging ? 0.3 : 0.15}
        shadowOffsetY={isDragging ? 6 : 2}
      />

      {isHovered && !isDragging && (
        <Group
          x={width / 2 - 8}
          y={-height / 2 - 8}
          onClick={() => onRemove(id)}
          onTap={() => onRemove(id)}
        >
          <Circle radius={10} fill="#ef4444" />
          <Text
            text="×"
            x={-5}
            y={-7}
            fontSize={14}
            fontFamily="system-ui, sans-serif"
            fill="#ffffff"
            fontStyle="bold"
          />
        </Group>
      )}
    </Group>
  );
};
