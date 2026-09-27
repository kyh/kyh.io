import { Text } from "react-konva";

import type { LayoutConfig, MatrixBounds } from "@/lib/layouts";
import type { LabelValues, ThemeType } from "@/lib/types";

interface AxisLabelsProps {
  layout: LayoutConfig;
  labels: LabelValues;
  bounds: MatrixBounds;
  theme: ThemeType;
  onLabelClick: (key: string) => void;
}

const THEME_TEXT_COLORS = {
  dark: "#9ca3af",
  light: "#6b7280",
};

export const AxisLabels = ({ layout, labels, bounds, theme, onLabelClick }: AxisLabelsProps) => {
  const fill = THEME_TEXT_COLORS[theme];

  const baseProps = {
    fill,
    fontFamily: "system-ui, sans-serif",
    fontSize: 14,
  };

  return (
    <>
      {layout.labels.map((labelDef) => {
        const pos = labelDef.position(bounds);
        return (
          <Text
            key={labelDef.key}
            text={labels[labelDef.key] ?? labelDef.defaultText}
            x={pos.x}
            y={pos.y}
            rotation={labelDef.rotation}
            align={labelDef.textProps?.align}
            fontStyle={labelDef.textProps?.fontStyle}
            offsetX={labelDef.textProps?.offsetX}
            offsetY={labelDef.textProps?.offsetY}
            {...baseProps}
            onClick={() => onLabelClick(labelDef.key)}
            onTap={() => onLabelClick(labelDef.key)}
          />
        );
      })}
    </>
  );
};
