import { Circle, Line, Rect } from "react-konva";

import type { MatrixBounds } from "@/lib/layouts";
import type { GridType, QuadrantColors, ThemeType } from "@/lib/types";

interface QuadrantGridProps {
  canvasWidth: number;
  canvasHeight: number;
  bounds: MatrixBounds;
  colors: QuadrantColors;
  gridType: GridType;
  showOuterBorder: boolean;
  theme: ThemeType;
}

const GRID_SPACING = 40;
const THEME_COLORS = {
  light: { bg: "#f9fafb", grid: "#d1d5db", axis: "#9ca3af" },
  dark: { bg: "#1f2937", grid: "#4b5563", axis: "#6b7280" },
};

export const QuadrantGrid = ({
  canvasWidth,
  canvasHeight,
  bounds,
  colors,
  gridType,
  showOuterBorder,
  theme,
}: QuadrantGridProps) => {
  const { x: bx, y: by, width, height } = bounds;
  const centerX = bx + width / 2;
  const centerY = by + height / 2;
  const themeColors = THEME_COLORS[theme];

  const renderGrid = () => {
    if (gridType === "none") return null;

    const elements: React.ReactNode[] = [];

    if (gridType === "squares") {
      for (let x = bx + GRID_SPACING; x < bx + width; x += GRID_SPACING) {
        elements.push(
          <Line
            key={`v-${x}`}
            points={[x, by, x, by + height]}
            stroke={themeColors.grid}
            strokeWidth={1}
          />,
        );
      }
      for (let y = by + GRID_SPACING; y < by + height; y += GRID_SPACING) {
        elements.push(
          <Line
            key={`h-${y}`}
            points={[bx, y, bx + width, y]}
            stroke={themeColors.grid}
            strokeWidth={1}
          />,
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
              fill={themeColors.grid}
            />,
          );
        }
      }
    }

    return elements;
  };

  return (
    <>
      {/* Background */}
      <Rect
        x={0}
        y={0}
        width={canvasWidth}
        height={canvasHeight}
        fill={themeColors.bg}
      />

      {/* Quadrant backgrounds */}
      <Rect
        x={bx}
        y={by}
        width={width / 2}
        height={height / 2}
        fill={colors.topLeft}
      />
      <Rect
        x={centerX}
        y={by}
        width={width / 2}
        height={height / 2}
        fill={colors.topRight}
      />
      <Rect
        x={bx}
        y={centerY}
        width={width / 2}
        height={height / 2}
        fill={colors.bottomLeft}
      />
      <Rect
        x={centerX}
        y={centerY}
        width={width / 2}
        height={height / 2}
        fill={colors.bottomRight}
      />

      {/* Grid pattern */}
      {renderGrid()}

      {/* Divider lines */}
      <Line
        points={[centerX, by, centerX, by + height]}
        stroke={themeColors.axis}
        strokeWidth={1}
      />
      <Line
        points={[bx, centerY, bx + width, centerY]}
        stroke={themeColors.axis}
        strokeWidth={1}
      />
      {showOuterBorder && (
        <Rect
          x={bx}
          y={by}
          width={width}
          height={height}
          stroke={themeColors.axis}
          strokeWidth={1}
          fill="transparent"
        />
      )}
    </>
  );
};
