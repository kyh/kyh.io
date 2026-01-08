import { Text } from "react-konva";
import type { AxisLabels as AxisLabelsType, LayoutType } from "@/lib/types";

interface MatrixBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AxisLabelsProps {
  labels: AxisLabelsType;
  bounds: MatrixBounds;
  layoutType: LayoutType;
  onLabelClick: (key: keyof AxisLabelsType) => void;
}

export const AxisLabels = ({
  labels,
  bounds,
  layoutType,
  onLabelClick,
}: AxisLabelsProps) => {
  const { x: bx, y: by, width, height } = bounds;
  const centerX = bx + width / 2;
  const centerY = by + height / 2;
  const padding = 16;

  if (layoutType === "edge") {
    // Edge layout: X labels as column headers at top, Y labels as row headers on left (rotated)
    const headerOffset = 25;
    return (
      <>
        {/* X-axis labels at TOP as column headers */}
        {/* xNegative = left column header */}
        <Text
          text={labels.xNegative}
          x={bx + width / 4}
          y={by - headerOffset}
          fontSize={14}
          fontFamily="system-ui, sans-serif"
          fontStyle="bold"
          fill="#374151"
          align="center"
          offsetX={30}
          onClick={() => onLabelClick("xNegative")}
          onTap={() => onLabelClick("xNegative")}
        />
        {/* xPositive = right column header */}
        <Text
          text={labels.xPositive}
          x={bx + (width * 3) / 4}
          y={by - headerOffset}
          fontSize={14}
          fontFamily="system-ui, sans-serif"
          fontStyle="bold"
          fill="#374151"
          align="center"
          offsetX={30}
          onClick={() => onLabelClick("xPositive")}
          onTap={() => onLabelClick("xPositive")}
        />

        {/* Y-axis labels on LEFT as row headers (rotated) */}
        {/* yPositive = top row header */}
        <Text
          text={labels.yPositive}
          x={bx - headerOffset}
          y={by + height / 4}
          fontSize={14}
          fontFamily="system-ui, sans-serif"
          fontStyle="bold"
          fill="#374151"
          rotation={-90}
          offsetY={-7}
          onClick={() => onLabelClick("yPositive")}
          onTap={() => onLabelClick("yPositive")}
        />
        {/* yNegative = bottom row header */}
        <Text
          text={labels.yNegative}
          x={bx - headerOffset}
          y={by + (height * 3) / 4}
          fontSize={14}
          fontFamily="system-ui, sans-serif"
          fontStyle="bold"
          fill="#374151"
          rotation={-90}
          offsetY={-7}
          onClick={() => onLabelClick("yNegative")}
          onTap={() => onLabelClick("yNegative")}
        />
      </>
    );
  }

  // Axis layout: labels at the ends of axes (inside the matrix area)
  return (
    <>
      {/* X-axis positive (right side) */}
      <Text
        text={labels.xPositive}
        x={bx + width - 80}
        y={centerY + padding}
        fontSize={14}
        fontFamily="system-ui, sans-serif"
        fill="#374151"
        onClick={() => onLabelClick("xPositive")}
        onTap={() => onLabelClick("xPositive")}
      />

      {/* X-axis negative (left side) */}
      <Text
        text={labels.xNegative}
        x={bx + padding}
        y={centerY + padding}
        fontSize={14}
        fontFamily="system-ui, sans-serif"
        fill="#374151"
        onClick={() => onLabelClick("xNegative")}
        onTap={() => onLabelClick("xNegative")}
      />

      {/* Y-axis positive (top) */}
      <Text
        text={labels.yPositive}
        x={centerX + padding}
        y={by + padding}
        fontSize={14}
        fontFamily="system-ui, sans-serif"
        fill="#374151"
        onClick={() => onLabelClick("yPositive")}
        onTap={() => onLabelClick("yPositive")}
      />

      {/* Y-axis negative (bottom) */}
      <Text
        text={labels.yNegative}
        x={centerX + padding}
        y={by + height - padding - 14}
        fontSize={14}
        fontFamily="system-ui, sans-serif"
        fill="#374151"
        onClick={() => onLabelClick("yNegative")}
        onTap={() => onLabelClick("yNegative")}
      />
    </>
  );
};
