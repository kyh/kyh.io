import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { DEFAULT_TAG_COLOR, TAG_COLORS } from "@/lib/constants";

interface TagData {
  id: string;
  text: string;
  color: string;
}

interface DragState {
  tag: TagData;
  x: number;
  y: number;
  startX: number;
  startY: number;
  rotation: number;
  scale: number;
}

interface TagCreatorProps {
  onTagDrop?: (
    tag: { text: string; color: string },
    x: number,
    y: number,
  ) => void;
  canvasRef?: React.RefObject<HTMLElement | null>;
}

export const TagCreator = ({ onTagDrop, canvasRef }: TagCreatorProps) => {
  const [text, setText] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_TAG_COLOR);
  const [tags, setTags] = useState<TagData[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isSettling, setIsSettling] = useState<string | null>(null);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number>(0);

  const handleCreate = () => {
    if (!text.trim()) return;
    setTags((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: text.trim(), color },
    ]);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreate();
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, tag: TagData) => {
    e.preventDefault();
    document.body.classList.add("dragging");
    setDragState({
      tag,
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      rotation: 0,
      scale: 1.1,
    });
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      const speed = Math.sqrt(dx * dx + dy * dy);
      const tilt = Math.min(speed * 0.6, 10);
      const rotation =
        dx !== 0 ? tilt * Math.sign(dx) : dragState.rotation * 0.9;

      setDragState((prev) =>
        prev ? { ...prev, x: e.clientX, y: e.clientY, rotation } : null,
      );
      lastPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e: MouseEvent) => {
      document.body.classList.remove("dragging");

      // Check if dropped on canvas
      if (canvasRef?.current && dragState) {
        const rect = canvasRef.current.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          // Dropped on canvas - add tag and remove from sidebar
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          onTagDrop?.(
            { text: dragState.tag.text, color: dragState.tag.color },
            x,
            y,
          );
          setTags((prev) => prev.filter((t) => t.id !== dragState.tag.id));
        } else {
          // Dropped outside - trigger settle animation
          setIsSettling(dragState.tag.id);
          setTimeout(() => setIsSettling(null), 300);
        }
      }

      setDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, canvasRef, onTagDrop]);

  // Settle animation
  useEffect(() => {
    if (!isSettling) return;
    cancelAnimationFrame(frameRef.current);
    // Animation handled by CSS
  }, [isSettling]);

  return (
    <>
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Create Tags</h3>

        <div className="space-y-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tag name..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          <div className="flex flex-wrap gap-1">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full transition-transform ${
                  color === c
                    ? "scale-110 ring-2 ring-gray-400 ring-offset-1"
                    : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <button
            onClick={handleCreate}
            disabled={!text.trim()}
            className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Tag
          </button>
        </div>

        {tags.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Drag tags to canvas:</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  onMouseDown={(e) => handleMouseDown(e, tag)}
                  className={`cursor-grab rounded px-3 py-1.5 text-sm text-white shadow-sm transition-all select-none hover:shadow-md ${
                    isSettling === tag.id ? "animate-light-wobble" : ""
                  } ${dragState?.tag.id === tag.id ? "opacity-40" : ""}`}
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating drag element */}
      {dragState &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 rounded px-3 py-1.5 text-sm text-white"
            style={{
              left: dragState.x,
              top: dragState.y,
              transform: `translate(-50%, -50%) scale(${dragState.scale}) rotate(${dragState.rotation}deg)`,
              backgroundColor: dragState.tag.color,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            {dragState.tag.text}
          </div>,
          document.body,
        )}
    </>
  );
};
