import { Rect, Line, Circle } from "react-konva";
import type { QuadrantColors, GridType, LayoutType } from "@/lib/types";

interface MatrixBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface QuadrantGridProps {
  canvasWidth: number;
  canvasHeight: number;
  bounds: MatrixBounds;
  colors: QuadrantColors;
  gridType: GridType;
  layoutType: LayoutType;
}

const GRID_SPACING = 40;
const GRID_COLOR = "#e5e7eb";
const AXIS_COLOR = "#6b7280";

export const QuadrantGrid = ({
  canvasWidth,
  canvasHeight,
  bounds,
  colors,
  gridType,
  layoutType,
}: QuadrantGridProps) => {
  const { x: bx, y: by, width, height } = bounds;
  const centerX = bx + width / 2;
  const centerY = by + height / 2;

  const renderGrid = () => {
    if (gridType === "none") return null;

    const elements: React.ReactNode[] = [];

    if (gridType === "squares") {
      for (let x = bx + GRID_SPACING; x < bx + width; x += GRID_SPACING) {
        elements.push(
          <Line
            key={`v-${x}`}
            points={[x, by, x, by + height]}
            stroke={GRID_COLOR}
            strokeWidth={1}
          />
        );
      }
      for (let y = by + GRID_SPACING; y < by + height; y += GRID_SPACING) {
        elements.push(
          <Line
            key={`h-${y}`}
            points={[bx, y, bx + width, y]}
            stroke={GRID_COLOR}
            strokeWidth={1}
          />
        );
      }
    } else if (gridType === "dots") {
      for (let x = bx + GRID_SPACING; x < bx + width; x += GRID_SPACING) {
        for (let y = by + GRID_SPACING; y < by + height; y += GRID_SPACING) {
          elements.push(
            <Circle
              key={`d-${x}-${y}`}
              x={x}
              y={y}
              radius={1.5}
              fill={GRID_COLOR}
            />
          );
        }
      }
    }

    return elements;
  };

  return (
    <>
      {/* Background */}
      <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#f9fafb" />

      {/* Quadrant backgrounds */}
      <Rect x={bx} y={by} width={width / 2} height={height / 2} fill={colors.topLeft} />
      <Rect x={centerX} y={by} width={width / 2} height={height / 2} fill={colors.topRight} />
      <Rect x={bx} y={centerY} width={width / 2} height={height / 2} fill={colors.bottomLeft} />
      <Rect x={centerX} y={centerY} width={width / 2} height={height / 2} fill={colors.bottomRight} />

      {/* Grid pattern */}
      {renderGrid()}

      {/* Divider lines between quadrants */}
      {layoutType === "edge" ? (
        <>
          {/* Edge layout: simple divider lines, no center axes */}
          <Line points={[centerX, by, centerX, by + height]} stroke={AXIS_COLOR} strokeWidth={1} />
          <Line points={[bx, centerY, bx + width, centerY]} stroke={AXIS_COLOR} strokeWidth={1} />
          {/* Outer border */}
          <Rect x={bx} y={by} width={width} height={height} stroke={AXIS_COLOR} strokeWidth={1} fill="transparent" />
        </>
      ) : (
        <>
          {/* Axis layout: lines through center */}
          <Line points={[centerX, by, centerX, by + height]} stroke={AXIS_COLOR} strokeWidth={1} />
          <Line points={[bx, centerY, bx + width, centerY]} stroke={AXIS_COLOR} strokeWidth={1} />
        </>
      )}
    </>
  );
};
