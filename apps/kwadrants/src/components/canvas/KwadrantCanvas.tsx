import { forwardRef, useState, useMemo } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import { QuadrantGrid } from "./QuadrantGrid";
import { AxisLabels } from "./AxisLabels";
import { Tag } from "./Tag";
import { CanvasImage } from "./CanvasImage";
import { useKwadrant } from "@/lib/KwadrantContext";
import type { AxisLabels as AxisLabelsType } from "@/lib/types";

interface KwadrantCanvasProps {
  width: number;
  height: number;
}

interface LabelEditorProps {
  value: string;
  position: { x: number; y: number };
  isRightEdge?: boolean;
  isDark?: boolean;
  onSave: (value: string) => void;
  onClose: () => void;
}

const LabelEditor = ({
  value,
  position,
  isRightEdge,
  isDark,
  onSave,
  onClose,
}: LabelEditorProps) => {
  const [text, setText] = useState(value);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSave(text);
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        onSave(text);
        onClose();
      }}
      autoFocus
      className={`absolute rounded px-1 text-xs shadow-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${
        isDark ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
      } border`}
      style={{
        left: isRightEdge ? "auto" : position.x,
        right: isRightEdge ? 16 : "auto",
        top: position.y,
        width: 70,
        height: 20,
      }}
    />
  );
};

export const KwadrantCanvas = forwardRef<Konva.Stage, KwadrantCanvasProps>(
  ({ width, height }, ref) => {
    const {
      state,
      updateTagPosition,
      removeTag,
      updateImagePosition,
      removeImage,
      updateAxisLabel
    } = useKwadrant();
    const [editingLabel, setEditingLabel] = useState<{
      key: keyof AxisLabelsType;
      position: { x: number; y: number };
    } | null>(null);

    // Calculate matrix bounds based on layout
    const bounds = useMemo(() => {
      if (state.layoutType === "edge") {
        // Edge layout: needs margin for headers on top and left
        const topMargin = 50;
        const leftMargin = 80;
        const rightMargin = 20;
        const bottomMargin = 20;
        return {
          x: leftMargin,
          y: topMargin,
          width: width - leftMargin - rightMargin,
          height: height - topMargin - bottomMargin,
        };
      }
      // Axis layout: fullscreen
      return { x: 0, y: 0, width, height };
    }, [width, height, state.layoutType]);

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const padding = 16;

    const labelPositions: Record<keyof AxisLabelsType, { x: number; y: number }> = state.layoutType === "edge"
      ? {
          // Edge layout: headers at top and left
          xNegative: { x: bounds.x + bounds.width / 4 - 30, y: bounds.y - 35 },
          xPositive: { x: bounds.x + (bounds.width * 3) / 4 - 30, y: bounds.y - 35 },
          yPositive: { x: bounds.x - 70, y: bounds.y + bounds.height / 4 - 10 },
          yNegative: { x: bounds.x - 70, y: bounds.y + (bounds.height * 3) / 4 - 10 },
        }
      : {
          // Axis layout: at the ends of axes
          xPositive: { x: width - 80, y: centerY + padding },
          xNegative: { x: padding, y: centerY + padding },
          yPositive: { x: centerX + padding, y: padding },
          yNegative: { x: centerX + padding, y: height - padding - 14 },
        };

    const handleLabelClick = (key: keyof AxisLabelsType) => {
      setEditingLabel({ key, position: labelPositions[key] });
    };

    return (
      <div className="relative w-full h-full">
        <Stage width={width} height={height} ref={ref}>
          <Layer>
            <QuadrantGrid
              canvasWidth={width}
              canvasHeight={height}
              bounds={bounds}
              colors={state.quadrantColors}
              gridType={state.gridType}
              layoutType={state.layoutType}
              theme={state.theme}
            />
            <AxisLabels
              labels={state.axisLabels}
              bounds={bounds}
              layoutType={state.layoutType}
              theme={state.theme}
              onLabelClick={handleLabelClick}
            />
            {state.images.map((image) => (
              <CanvasImage
                key={image.id}
                {...image}
                onDragEnd={updateImagePosition}
                onRemove={removeImage}
              />
            ))}
            {state.tags.map((tag) => (
              <Tag
                key={tag.id}
                {...tag}
                onDragEnd={updateTagPosition}
                onRemove={removeTag}
              />
            ))}
          </Layer>
        </Stage>

        {editingLabel && (
          <LabelEditor
            value={state.axisLabels[editingLabel.key]}
            position={editingLabel.position}
            isRightEdge={editingLabel.key === "xPositive" && state.layoutType === "axis"}
            isDark={state.theme === "dark"}
            onSave={(value) => updateAxisLabel(editingLabel.key, value)}
            onClose={() => setEditingLabel(null)}
          />
        )}
      </div>
    );
  }
);

KwadrantCanvas.displayName = "KwadrantCanvas";
