import type Konva from "konva";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  Download,
  Grid3X3,
  GripVertical,
  Image,
  Layout,
  Moon,
  Palette,
  Plus,
  RotateCcw,
  Sun,
  Tag,
} from "lucide-react";
import { animate, motion, useMotionValue } from "motion/react";
import * as stylex from "@stylexjs/stylex";
import {
  colors,
  defaults,
  fontSizeLineHeights,
  fontSizes,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import type { GridType, LayoutType, QuadrantColors } from "@/lib/types";
import { DEFAULT_TAG_COLOR, STORAGE_KEY, TAG_COLORS } from "@/lib/constants";
import { useKwadrant } from "@/lib/KwadrantContext";
import { getAllLayouts } from "@/lib/layouts";

type IslandMode =
  | "idle"
  | "add-menu"
  | "adding-tag"
  | "adding-image"
  | "colors"
  | "export"
  | "grid"
  | "layout";
type PanelPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type PanelSize = { width: number; height: number };

const SHADOW_LG = "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
const TRANSITION_COLORS =
  "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke";

const styles = stylex.create({
  column: { display: "flex", flexDirection: "column" },
  gap1: { gap: spacing[1] },
  gap2: { gap: spacing[2] },

  tagInput: {
    width: "100%",
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    paddingInline: spacing[2],
    paddingBlock: spacing[1.5],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    outlineStyle: { default: null, ":focus": "none" },
    boxShadow: { default: null, ":focus": `0 0 0 2px ${colors.blue500}` },
  },
  tagInputDark: {
    borderColor: colors.gray600,
    backgroundColor: colors.gray800,
    color: colors.white,
    "::placeholder": { color: colors.gray400 },
  },
  tagInputLight: {
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    color: colors.gray900,
  },

  swatchRow: { display: "flex", flexWrap: "wrap", gap: spacing[1] },
  swatch: {
    height: spacing[5],
    width: spacing[5],
    borderRadius: radii.full,
    transitionProperty: "transform, translate, scale, rotate",
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: defaults.transitionDuration,
  },
  swatchSelected: {
    scale: "110% 110%",
    boxShadow: `0 0 0 1px ${colors.white}, 0 0 0 3px ${colors.gray400}`,
  },

  primaryButton: {
    width: "100%",
    borderRadius: radii.md,
    paddingInline: spacing[3],
    paddingBlock: spacing[1.5],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    transitionProperty: TRANSITION_COLORS,
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: defaults.transitionDuration,
    opacity: { default: null, ":disabled": 0.5 },
  },
  primaryButtonDark: {
    backgroundColor: {
      default: colors.white,
      "@media (hover: hover)": { default: colors.white, ":hover": colors.gray100 },
    },
    color: colors.gray900,
  },
  primaryButtonLight: {
    backgroundColor: {
      default: colors.gray900,
      "@media (hover: hover)": { default: colors.gray900, ":hover": colors.gray800 },
    },
    color: colors.white,
  },

  hidden: { display: "none" },

  dashedButton: {
    width: "100%",
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingInline: spacing[3],
    paddingBlock: spacing[1.5],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    transitionProperty: TRANSITION_COLORS,
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: defaults.transitionDuration,
  },
  dashedButtonDark: {
    borderColor: colors.gray600,
    color: colors.gray300,
    backgroundColor: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": colors.gray700 },
    },
  },
  dashedButtonLight: {
    borderColor: colors.gray300,
    color: colors.gray700,
    backgroundColor: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": colors.gray50 },
    },
  },

  colorRow: { display: "flex", alignItems: "center", gap: spacing[2] },
  colorInput: {
    height: spacing[6],
    width: spacing[6],
    cursor: "pointer",
    borderRadius: radii.sm,
    borderWidth: 0,
  },
  colorLabel: { fontSize: fontSizes.xs, lineHeight: fontSizeLineHeights.xs },
  colorLabelDark: { color: colors.gray400 },
  colorLabelLight: { color: colors.gray600 },

  dropGhost: {
    pointerEvents: "none",
    position: "fixed",
    zIndex: 40,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.gray400,
    backgroundColor: colors.gray300,
  },

  panel: {
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 50,
    minWidth: "140px",
    cursor: { default: "grab", ":active": "grabbing" },
    borderRadius: radii.xl,
    borderWidth: 1,
    borderStyle: "solid",
    padding: spacing[2],
    boxShadow: SHADOW_LG,
  },
  panelDark: { borderColor: colors.gray700, backgroundColor: colors.gray800 },
  panelLight: { borderColor: colors.gray200, backgroundColor: colors.white },

  panelHeader: {
    marginBottom: spacing[1],
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBlock: spacing[1],
  },
  panelHeaderDark: { color: colors.gray500 },
  panelHeaderLight: { color: colors.gray400 },
  headerLeft: { display: "flex", alignItems: "center", gap: spacing[1] },

  iconButton: {
    borderRadius: radii.sm,
    padding: spacing[1],
    transitionProperty: TRANSITION_COLORS,
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: defaults.transitionDuration,
  },
  iconButtonDark: {
    backgroundColor: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": colors.gray700 },
    },
  },
  iconButtonLight: {
    backgroundColor: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": colors.gray100 },
    },
  },

  menuButton: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    gap: spacing[2],
    borderRadius: radii.lg,
    paddingInline: spacing[3],
    paddingBlock: spacing[2],
    textAlign: "left",
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    transitionProperty: TRANSITION_COLORS,
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: defaults.transitionDuration,
  },
  menuButtonDark: {
    color: colors.gray300,
    backgroundColor: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": colors.gray700 },
    },
  },
  menuButtonLight: {
    color: colors.gray700,
    backgroundColor: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": colors.gray100 },
    },
  },
  selectedDark: { backgroundColor: colors.white, color: colors.gray900 },
  selectedLight: { backgroundColor: colors.gray900, color: colors.white },
});

const PANEL_POSITION_KEY = "kwadrant-panel-position";
const MARGIN = 16;
const DEFAULT_PANEL_SIZE: PanelSize = { width: 140, height: 200 };
const PANEL_POSITIONS: readonly PanelPosition[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];
const GRID_TYPES: readonly GridType[] = ["none", "squares", "dots"];
const QUADRANT_OPTIONS: ReadonlyArray<{
  key: keyof QuadrantColors;
  label: string;
}> = [
  { key: "topLeft", label: "Top Left" },
  { key: "topRight", label: "Top Right" },
  { key: "bottomLeft", label: "Bottom Left" },
  { key: "bottomRight", label: "Bottom Right" },
];

const isPanelPosition = (value: string | null): value is PanelPosition =>
  value === "top-left" ||
  value === "top-right" ||
  value === "bottom-left" ||
  value === "bottom-right";

const isLayoutType = (value: string): value is LayoutType => value === "axis" || value === "edge";

const getClosestPosition = (px: number, py: number): PanelPosition => {
  const isLeft = px < window.innerWidth / 2;
  const isTop = py < window.innerHeight / 2;
  if (isTop && isLeft) return "top-left";
  if (isTop) return "top-right";
  if (isLeft) return "bottom-left";
  return "bottom-right";
};

const resetStoredState = () => {
  if (!confirm("Reset all? This cannot be undone.")) return;
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
};

const getBackTarget = (mode: IslandMode): IslandMode | null => {
  switch (mode) {
    case "add-menu":
      return "idle";
    case "adding-tag":
    case "adding-image":
      return "add-menu";
    case "colors":
    case "export":
    case "grid":
    case "layout":
      return "idle";
    case "idle":
      return null;
  }
};

interface FloatingIslandProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  canvasSize: { width: number; height: number };
}

export const FloatingIsland = ({ stageRef, canvasSize }: FloatingIslandProps) => {
  const [mode, setMode] = useState<IslandMode>("idle");
  const [tagText, setTagText] = useState("");
  const [tagColor, setTagColor] = useState<string>(DEFAULT_TAG_COLOR);
  const [position, setPosition] = useState<PanelPosition>(() => {
    if (typeof window === "undefined") return "bottom-left";
    const storedPosition = localStorage.getItem(PANEL_POSITION_KEY);
    if (isPanelPosition(storedPosition)) return storedPosition;
    return "bottom-left";
  });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredPosition, setHoveredPosition] = useState<PanelPosition>("bottom-left");
  const [dragGhostSize, setDragGhostSize] = useState(DEFAULT_PANEL_SIZE);
  const panelSizeRef = useRef(DEFAULT_PANEL_SIZE);
  const islandRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const { addTag, addImage, state, setQuadrantColor, setGridType, setLayoutType, setTheme } =
    useKwadrant();
  const isDark = state.theme === "dark";

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Hides the panel until it has been measured and snapped, without the extra
  // render an `isReady` state would cost.
  const opacity = useMotionValue(0);

  const getSnapPosition = useCallback(
    (pos: PanelPosition, size: PanelSize) => ({
      x: pos.includes("left") ? MARGIN : window.innerWidth - MARGIN - size.width,
      y: pos.includes("top") ? MARGIN : window.innerHeight - MARGIN - size.height,
    }),
    [],
  );

  const updatePosition = useCallback(() => {
    if (!islandRef.current || isDragging) return;
    const rect = islandRef.current.getBoundingClientRect();
    panelSizeRef.current = { width: rect.width, height: rect.height };
    const pos = getSnapPosition(position, panelSizeRef.current);
    x.set(pos.x);
    y.set(pos.y);
    opacity.set(1);
  }, [getSnapPosition, isDragging, opacity, position, x, y]);

  // Re-snap whenever the panel is measured differently — on mount, on window
  // resize, and whenever opening a menu changes the panel's own size.
  useLayoutEffect(() => {
    const island = islandRef.current;
    if (!island) return;
    updatePosition();

    const observer = new ResizeObserver(updatePosition);
    observer.observe(island);
    window.addEventListener("resize", updatePosition);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePosition);
    };
  }, [updatePosition]);

  // Click outside to close menu
  useEffect(() => {
    if (mode === "idle") return;
    const handleClickOutside = (e: MouseEvent) => {
      if (islandRef.current && e.target instanceof Node && !islandRef.current.contains(e.target)) {
        setMode("idle");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mode]);

  const handleDragStart = () => {
    setDragGhostSize(panelSizeRef.current);
    setIsDragging(true);
  };

  const handleDrag = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { point: { x: number; y: number } },
  ) => {
    const newPos = getClosestPosition(info.point.x, info.point.y);
    if (newPos !== hoveredPosition) setHoveredPosition(newPos);
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { point: { x: number; y: number } },
  ) => {
    const newPosition = getClosestPosition(info.point.x, info.point.y);
    const targetPos = getSnapPosition(newPosition, panelSizeRef.current);
    animate(x, targetPos.x, { type: "spring", stiffness: 400, damping: 30 });
    animate(y, targetPos.y, { type: "spring", stiffness: 400, damping: 30 });
    setPosition(newPosition);
    localStorage.setItem(PANEL_POSITION_KEY, newPosition);
    setIsDragging(false);
  };

  const centerX = canvasSize.width / 2;
  const centerY = canvasSize.height / 2;

  const handleAddTag = () => {
    if (!tagText.trim()) return;
    addTag({ text: tagText.trim(), color: tagColor, x: centerX, y: centerY });
    setTagText("");
    // Keep input focused for multiple adds
    tagInputRef.current?.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result;
      if (src == null || src instanceof ArrayBuffer) return;
      const img = new window.Image();
      img.onload = () => {
        const maxSize = 150;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        addImage({
          src,
          width: img.width * ratio,
          height: img.height * ratio,
          x: centerX,
          y: centerY,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleExport = (format: "png" | "jpeg") => {
    if (!stageRef.current) return;
    const dataURL = stageRef.current.toDataURL({
      mimeType: format === "jpeg" ? "image/jpeg" : "image/png",
      quality: 0.9,
      pixelRatio: 2,
    });
    const link = document.createElement("a");
    link.download = `kwadrant.${format}`;
    link.href = dataURL;
    link.click();
    setMode("idle");
  };

  const renderContent = () => {
    switch (mode) {
      case "add-menu":
        return (
          <div {...stylex.props(styles.column, styles.gap1)}>
            <MenuButton
              onClick={() => setMode("adding-tag")}
              icon={<Tag size={18} />}
              label="Tag"
              isDark={isDark}
            />
            <MenuButton
              onClick={() => {
                setMode("adding-image");
                setTimeout(() => fileInputRef.current?.click(), 0);
              }}
              icon={<Image size={18} />}
              label="Image"
              isDark={isDark}
            />
          </div>
        );

      case "adding-tag":
        return (
          <div {...stylex.props(styles.column, styles.gap2)}>
            <input
              aria-label="Tag name"
              ref={tagInputRef}
              type="text"
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="Tag name..."
              autoFocus
              {...stylex.props(
                styles.tagInput,
                isDark ? styles.tagInputDark : styles.tagInputLight,
              )}
            />
            <div {...stylex.props(styles.swatchRow)}>
              {TAG_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setTagColor(c)}
                  aria-label={`Use ${c} tag color`}
                  aria-pressed={tagColor === c}
                  {...stylex.props(styles.swatch, tagColor === c && styles.swatchSelected)}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!tagText.trim()}
              {...stylex.props(
                styles.primaryButton,
                isDark ? styles.primaryButtonDark : styles.primaryButtonLight,
              )}
            >
              Add Tag
            </button>
          </div>
        );

      case "adding-image":
        return (
          <div {...stylex.props(styles.column, styles.gap2)}>
            <input
              aria-label="Upload image"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              {...stylex.props(styles.hidden)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              {...stylex.props(
                styles.dashedButton,
                isDark ? styles.dashedButtonDark : styles.dashedButtonLight,
              )}
            >
              Choose image...
            </button>
          </div>
        );

      case "colors":
        return (
          <div {...stylex.props(styles.column, styles.gap2)}>
            {QUADRANT_OPTIONS.map(({ key, label }) => (
              <label key={key} {...stylex.props(styles.colorRow)}>
                <input
                  type="color"
                  value={state.quadrantColors[key]}
                  onChange={(e) => setQuadrantColor(key, e.target.value)}
                  {...stylex.props(styles.colorInput)}
                />
                <span
                  {...stylex.props(
                    styles.colorLabel,
                    isDark ? styles.colorLabelDark : styles.colorLabelLight,
                  )}
                >
                  {label}
                </span>
              </label>
            ))}
          </div>
        );

      case "export":
        return (
          <div {...stylex.props(styles.column, styles.gap1)}>
            <MenuButton
              onClick={() => handleExport("png")}
              icon={<Download size={18} />}
              label="PNG"
              isDark={isDark}
            />
            <MenuButton
              onClick={() => handleExport("jpeg")}
              icon={<Download size={18} />}
              label="JPEG"
              isDark={isDark}
            />
          </div>
        );

      case "grid":
        return (
          <div {...stylex.props(styles.column, styles.gap1)}>
            {GRID_TYPES.map((type) => (
              <SelectButton
                key={type}
                selected={state.gridType === type}
                onClick={() => setGridType(type)}
                isDark={isDark}
              >
                {type === "none" ? "None" : type === "squares" ? "Squares" : "Dots"}
              </SelectButton>
            ))}
          </div>
        );

      case "layout":
        return (
          <div {...stylex.props(styles.column, styles.gap1)}>
            {getAllLayouts().map((layout) => {
              const layoutType = layout.id;
              if (!isLayoutType(layoutType)) return null;
              return (
                <SelectButton
                  key={layoutType}
                  selected={state.layoutType === layoutType}
                  onClick={() => setLayoutType(layoutType)}
                  isDark={isDark}
                >
                  {layout.displayName}
                </SelectButton>
              );
            })}
          </div>
        );

      default:
        return (
          <div {...stylex.props(styles.column, styles.gap1)}>
            <MenuButton
              onClick={() => setMode("add-menu")}
              icon={<Plus size={18} />}
              label="Add"
              isDark={isDark}
            />
            <MenuButton
              onClick={() => setMode("colors")}
              icon={<Palette size={18} />}
              label="Colors"
              isDark={isDark}
            />
            <MenuButton
              onClick={() => setMode("grid")}
              icon={<Grid3X3 size={18} />}
              label="Grid"
              isDark={isDark}
            />
            <MenuButton
              onClick={() => setMode("layout")}
              icon={<Layout size={18} />}
              label="Layout"
              isDark={isDark}
            />
            <MenuButton
              onClick={() => setMode("export")}
              icon={<Download size={18} />}
              label="Export"
              isDark={isDark}
            />
            <MenuButton
              onClick={resetStoredState}
              icon={<RotateCcw size={18} />}
              label="Reset"
              isDark={isDark}
            />
          </div>
        );
    }
  };

  const backTarget = getBackTarget(mode);

  return (
    <>
      {/* Ghost placement indicators */}
      {isDragging &&
        PANEL_POSITIONS.map((pos) => {
          const snapPos = getSnapPosition(pos, dragGhostSize);
          const isHovered = hoveredPosition === pos;
          return (
            <motion.div
              key={pos}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: isHovered ? 0.5 : 0.15,
                scale: isHovered ? 1 : 0.95,
              }}
              transition={{ duration: 0.15 }}
              {...stylex.props(styles.dropGhost)}
              style={{
                left: snapPos.x,
                top: snapPos.y,
                width: dragGhostSize.width,
                height: dragGhostSize.height,
              }}
            />
          );
        })}

      {/* Main panel */}
      <motion.div
        ref={islandRef}
        drag
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x, y, opacity }}
        whileDrag={{
          scale: 1.03,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
        }}
        {...stylex.props(styles.panel, isDark ? styles.panelDark : styles.panelLight)}
      >
        <div
          {...stylex.props(
            styles.panelHeader,
            isDark ? styles.panelHeaderDark : styles.panelHeaderLight,
          )}
        >
          <div {...stylex.props(styles.headerLeft)}>
            <GripVertical size={16} />
            {backTarget && (
              <button
                type="button"
                onClick={() => setMode(backTarget)}
                aria-label="Back"
                {...stylex.props(
                  styles.iconButton,
                  isDark ? styles.iconButtonDark : styles.iconButtonLight,
                )}
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Use light theme" : "Use dark theme"}
            {...stylex.props(
              styles.iconButton,
              isDark ? styles.iconButtonDark : styles.iconButtonLight,
            )}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        {renderContent()}
      </motion.div>
    </>
  );
};

const MenuButton = ({
  onClick,
  icon,
  label,
  isDark,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  isDark: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    {...stylex.props(styles.menuButton, isDark ? styles.menuButtonDark : styles.menuButtonLight)}
  >
    {icon}
    {label}
  </button>
);

const SelectButton = ({
  selected,
  onClick,
  isDark,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  isDark: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    {...stylex.props(
      styles.menuButton,
      isDark ? styles.menuButtonDark : styles.menuButtonLight,
      selected && (isDark ? styles.selectedDark : styles.selectedLight),
    )}
  >
    {children}
  </button>
);
