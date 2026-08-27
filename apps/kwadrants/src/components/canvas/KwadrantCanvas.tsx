import { boxShadow, ringSlots, shadowLayers } from "@repo/tailwind-compat/shadows.stylex";
import { leading } from "@repo/tailwind-compat/leading.stylex";
import type Konva from "konva";
import { forwardRef, useMemo, useState } from "react";
import { Layer, Stage } from "react-konva";
import * as stylex from "@stylexjs/stylex";
import { colors, fontSizes, radii, spacing } from "@repo/tailwind-compat/tokens.stylex";

import { useKwadrant } from "@/lib/KwadrantContext";
import { getDefaultLabels, getLayout } from "@/lib/layouts";
import { AxisLabels } from "./AxisLabels";
import { CanvasImage } from "./CanvasImage";
import { QuadrantGrid } from "./QuadrantGrid";
import { Tag } from "./Tag";

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

const styles = stylex.create({
  editor: {
    position: "absolute",
    borderRadius: radii.sm,
    paddingInline: spacing[1],
    fontSize: fontSizes.xs,
    lineHeight: leading.xs,
    borderWidth: 1,
    borderStyle: "solid",
    outlineStyle: { default: null, ":focus": "none" },
    boxShadow: {
      default: boxShadow.lg,
      ":focus": `${ringSlots.before}, 0 0 0 1px ${colors.blue500}, ${shadowLayers.lg}`,
    },
  },
  editorDark: {
    borderColor: colors.gray600,
    backgroundColor: colors.gray800,
    color: colors.white,
  },
  editorLight: {
    borderColor: colors.gray300,
    backgroundColor: colors.white,
    color: colors.gray900,
  },
  canvasWrap: {
    position: "relative",
    height: "100%",
    width: "100%",
  },
});

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
      aria-label="Edit canvas label"
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        onSave(text);
        onClose();
      }}
      autoFocus
      {...stylex.props(styles.editor, isDark ? styles.editorDark : styles.editorLight)}
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
    const { state, updateTagPosition, removeTag, updateImagePosition, removeImage, updateLabel } =
      useKwadrant();
    const [editingLabel, setEditingLabel] = useState<{
      key: string;
      position: { x: number; y: number };
    } | null>(null);

    const layout = getLayout(state.layoutType);
    const bounds = useMemo(() => layout.getBounds(width, height), [layout, width, height]);

    // Get current labels with defaults
    const currentLabels = useMemo(() => {
      const stored = state.layoutLabels[state.layoutType] ?? {};
      const defaults = getDefaultLabels(layout);
      return { ...defaults, ...stored };
    }, [state.layoutLabels, state.layoutType, layout]);

    // Derive editor positions from layout label definitions
    const getEditorPosition = (key: string) => {
      const labelDef = layout.labels.find((l) => l.key === key);
      if (!labelDef) return { x: 0, y: 0 };
      const pos = labelDef.position(bounds);
      // Adjust for editor offset
      return {
        x: pos.x - (labelDef.textProps?.offsetX ?? 0),
        y: pos.y - 10,
      };
    };

    const handleLabelClick = (key: string) => {
      setEditingLabel({ key, position: getEditorPosition(key) });
    };

    // Check if this label is on right edge (for axis layout xPositive)
    const isRightEdgeLabel = editingLabel?.key === "xPositive" && state.layoutType === "axis";

    return (
      <div {...stylex.props(styles.canvasWrap)}>
        <Stage width={width} height={height} ref={ref}>
          <Layer>
            <QuadrantGrid
              canvasWidth={width}
              canvasHeight={height}
              bounds={bounds}
              colors={state.quadrantColors}
              gridType={state.gridType}
              showOuterBorder={layout.showOuterBorder}
              theme={state.theme}
            />
            <AxisLabels
              layout={layout}
              labels={currentLabels}
              bounds={bounds}
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
              <Tag key={tag.id} {...tag} onDragEnd={updateTagPosition} onRemove={removeTag} />
            ))}
          </Layer>
        </Stage>

        {editingLabel && (
          <LabelEditor
            value={currentLabels[editingLabel.key] ?? ""}
            position={editingLabel.position}
            isRightEdge={isRightEdgeLabel}
            isDark={state.theme === "dark"}
            onSave={(value) => {
              updateLabel(state.layoutType, editingLabel.key, value);
            }}
            onClose={() => setEditingLabel(null)}
          />
        )}
      </div>
    );
  },
);

KwadrantCanvas.displayName = "KwadrantCanvas";
