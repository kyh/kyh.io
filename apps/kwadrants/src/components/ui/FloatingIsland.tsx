import { useState, useRef, useEffect, useLayoutEffect } from "react";
import type Konva from "konva";
import { motion, useMotionValue, animate } from "motion/react";
import { Plus, Palette, Download, RotateCcw, ChevronLeft, Tag, Image, Grid3X3, Layout, GripVertical } from "lucide-react";
import { useKwadrant } from "@/lib/KwadrantContext";
import { TAG_COLORS, STORAGE_KEY } from "@/lib/constants";
import type { QuadrantColors, GridType, LayoutType } from "@/lib/types";

type IslandMode = "idle" | "add-menu" | "adding-tag" | "adding-image" | "colors" | "export" | "grid" | "layout";
type PanelPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const PANEL_POSITION_KEY = "kwadrant-panel-position";
const MARGIN = 16;

interface FloatingIslandProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  canvasSize: { width: number; height: number };
}

export const FloatingIsland = ({ stageRef, canvasSize }: FloatingIslandProps) => {
  const [mode, setMode] = useState<IslandMode>("idle");
  const [tagText, setTagText] = useState("");
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);
  const [position, setPosition] = useState<PanelPosition>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(PANEL_POSITION_KEY);
      // Migrate old values
      if (stored === "left") return "bottom-left";
      if (stored === "right") return "bottom-right";
      return (stored as PanelPosition) || "bottom-left";
    }
    return "bottom-left";
  });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredPosition, setHoveredPosition] = useState<PanelPosition>("bottom-left");
  const [isReady, setIsReady] = useState(false);
  const panelSizeRef = useRef({ width: 140, height: 200 });
  const islandRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const { addTag, addImage, state, setQuadrantColor, setGridType, setLayoutType } = useKwadrant();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const getSnapPosition = (pos: PanelPosition, size = panelSizeRef.current) => ({
    x: pos.includes("left") ? MARGIN : window.innerWidth - MARGIN - size.width,
    y: pos.includes("top") ? MARGIN : window.innerHeight - MARGIN - size.height,
  });

  const getClosestPosition = (px: number, py: number): PanelPosition => {
    const midX = window.innerWidth / 2;
    const midY = window.innerHeight / 2;
    const isLeft = px < midX;
    const isTop = py < midY;
    if (isTop && isLeft) return "top-left";
    if (isTop && !isLeft) return "top-right";
    if (!isTop && isLeft) return "bottom-left";
    return "bottom-right";
  };

  const updatePosition = () => {
    if (!islandRef.current || isDragging) return;
    const rect = islandRef.current.getBoundingClientRect();
    panelSizeRef.current = { width: rect.width, height: rect.height };
    const pos = getSnapPosition(position);
    x.set(pos.x);
    y.set(pos.y);
  };

  // Measure and position on mount (before paint)
  useLayoutEffect(() => {
    updatePosition();
    setIsReady(true);
  }, []);

  // Update on resize, position change, or mode change
  useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [position, mode, isDragging]);

  // Click outside to close menu
  useEffect(() => {
    if (mode === "idle") return;
    const handleClickOutside = (e: MouseEvent) => {
      if (islandRef.current && !islandRef.current.contains(e.target as Node)) {
        setMode("idle");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mode]);

  const handleDragStart = () => setIsDragging(true);

  const handleDrag = (_: unknown, info: { point: { x: number; y: number } }) => {
    const newPos = getClosestPosition(info.point.x, info.point.y);
    if (newPos !== hoveredPosition) setHoveredPosition(newPos);
  };

  const handleDragEnd = (_: unknown, info: { point: { x: number; y: number } }) => {
    const newPosition = getClosestPosition(info.point.x, info.point.y);
    const targetPos = getSnapPosition(newPosition);
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
      const src = event.target?.result as string;
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

  const handleReset = () => {
    if (confirm("Reset all? This cannot be undone.")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  const renderContent = () => {
    switch (mode) {
      case "add-menu":
        return (
          <div className="flex flex-col gap-1">
            <BackButton onClick={() => setMode("idle")} />
            <MenuButton onClick={() => setMode("adding-tag")} icon={<Tag size={18} />} label="Tag" />
            <MenuButton onClick={() => {
              setMode("adding-image");
              setTimeout(() => fileInputRef.current?.click(), 0);
            }} icon={<Image size={18} />} label="Image" />
          </div>
        );

      case "adding-tag":
        return (
          <div className="flex flex-col gap-2">
            <BackButton onClick={() => setMode("add-menu")} />
            <input
              ref={tagInputRef}
              type="text"
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="Tag name..."
              autoFocus
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex flex-wrap gap-1">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTagColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    tagColor === c ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              onClick={handleAddTag}
              disabled={!tagText.trim()}
              className="w-full px-3 py-1.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Add Tag
            </button>
          </div>
        );

      case "adding-image":
        return (
          <div className="flex flex-col gap-2">
            <BackButton onClick={() => setMode("add-menu")} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-1.5 text-sm border border-dashed border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Choose image...
            </button>
          </div>
        );

      case "colors":
        return (
          <div className="flex flex-col gap-2">
            <BackButton onClick={() => setMode("idle")} />
            {(["topLeft", "topRight", "bottomLeft", "bottomRight"] as const).map((q) => (
              <div key={q} className="flex items-center gap-2">
                <input
                  type="color"
                  value={state.quadrantColors[q]}
                  onChange={(e) => setQuadrantColor(q as keyof QuadrantColors, e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0"
                />
                <span className="text-xs text-gray-600">
                  {q === "topLeft" ? "Top Left" : q === "topRight" ? "Top Right" : q === "bottomLeft" ? "Bottom Left" : "Bottom Right"}
                </span>
              </div>
            ))}
          </div>
        );

      case "export":
        return (
          <div className="flex flex-col gap-1">
            <BackButton onClick={() => setMode("idle")} />
            <MenuButton onClick={() => handleExport("png")} icon={<Download size={18} />} label="PNG" />
            <MenuButton onClick={() => handleExport("jpeg")} icon={<Download size={18} />} label="JPEG" />
          </div>
        );

      case "grid":
        return (
          <div className="flex flex-col gap-1">
            <BackButton onClick={() => setMode("idle")} />
            {(["none", "squares", "dots"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setGridType(type as GridType)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                  state.gridType === type
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {type === "none" ? "None" : type === "squares" ? "Squares" : "Dots"}
              </button>
            ))}
          </div>
        );

      case "layout":
        return (
          <div className="flex flex-col gap-1">
            <BackButton onClick={() => setMode("idle")} />
            {(["axis", "edge"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setLayoutType(type as LayoutType)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                  state.layoutType === type
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {type === "axis" ? "Axis" : "Edge"}
              </button>
            ))}
          </div>
        );

      default:
        return (
          <div className="flex flex-col gap-1">
            <MenuButton onClick={() => setMode("add-menu")} icon={<Plus size={18} />} label="Add" />
            <MenuButton onClick={() => setMode("colors")} icon={<Palette size={18} />} label="Colors" />
            <MenuButton onClick={() => setMode("grid")} icon={<Grid3X3 size={18} />} label="Grid" />
            <MenuButton onClick={() => setMode("layout")} icon={<Layout size={18} />} label="Layout" />
            <MenuButton onClick={() => setMode("export")} icon={<Download size={18} />} label="Export" />
            <MenuButton onClick={handleReset} icon={<RotateCcw size={18} />} label="Reset" />
          </div>
        );
    }
  };

  const size = panelSizeRef.current;
  const positions: PanelPosition[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

  return (
    <>
      {/* Ghost placement indicators */}
      {isDragging && positions.map((pos) => {
        const snapPos = getSnapPosition(pos);
        const isHovered = hoveredPosition === pos;
        return (
          <motion.div
            key={pos}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: isHovered ? 0.5 : 0.15, scale: isHovered ? 1 : 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed bg-gray-300 rounded-xl border-2 border-dashed border-gray-400 pointer-events-none z-40"
            style={{ left: snapPos.x, top: snapPos.y, width: size.width, height: size.height }}
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
        style={{ x, y, opacity: isReady ? 1 : 0 }}
        whileDrag={{ scale: 1.03, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)" }}
        className="fixed top-0 left-0 bg-white rounded-xl shadow-lg border border-gray-200 p-2 z-50 min-w-[140px] cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center justify-center py-1 mb-1 text-gray-400">
          <GripVertical size={16} />
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
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left"
  >
    {icon}
    {label}
  </button>
);

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors text-left mb-1"
  >
    <ChevronLeft size={16} />
    Back
  </button>
);
