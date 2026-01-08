import { Text } from "react-konva";
import type { AxisLabels as AxisLabelsType, LayoutType, ThemeType } from "@/lib/types";

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
  theme: ThemeType;
  onLabelClick: (key: keyof AxisLabelsType) => void;
}

const THEME_TEXT_COLORS = {
  light: "#6b7280",
  dark: "#9ca3af",
};

const LABEL_KEYS: (keyof AxisLabelsType)[] = ["xNegative", "xPositive", "yPositive", "yNegative"];

export const AxisLabels = ({
  labels,
  bounds,
  layoutType,
  theme,
  onLabelClick,
}: AxisLabelsProps) => {
  const fill = THEME_TEXT_COLORS[theme];
  const { x: bx, y: by, width, height } = bounds;
  const centerX = bx + width / 2;
  const centerY = by + height / 2;

  const baseProps = {
    fontSize: 14,
    fontFamily: "system-ui, sans-serif",
    fill,
  };

  const getPosition = (key: keyof AxisLabelsType) => {
    if (layoutType === "edge") {
      const headerOffset = 25;
      const positions = {
        xNegative: { x: bx + width / 4, y: by - headerOffset, offsetX: 30, align: "center" as const, fontStyle: "bold" as const },
        xPositive: { x: bx + (width * 3) / 4, y: by - headerOffset, offsetX: 30, align: "center" as const, fontStyle: "bold" as const },
        yPositive: { x: bx - headerOffset, y: by + height / 4, rotation: -90, offsetY: -7, fontStyle: "bold" as const },
        yNegative: { x: bx - headerOffset, y: by + (height * 3) / 4, rotation: -90, offsetY: -7, fontStyle: "bold" as const },
      };
      return positions[key];
    }
    const padding = 16;
    const positions = {
      xPositive: { x: bx + width - 80, y: centerY + padding },
      xNegative: { x: bx + padding, y: centerY + padding },
      yPositive: { x: centerX + padding, y: by + padding },
      yNegative: { x: centerX + padding, y: by + height - padding - 14 },
    };
    return positions[key];
  };

  return (
    <>
      {LABEL_KEYS.map((key) => (
        <Text
          key={key}
          text={labels[key]}
          {...baseProps}
          {...getPosition(key)}
          onClick={() => onLabelClick(key)}
          onTap={() => onLabelClick(key)}
        />
      ))}
    </>
  );
};
