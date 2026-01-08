import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface ImageData {
  id: string;
  src: string;
  width: number;
  height: number;
}

interface DragState {
  image: ImageData;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

interface ImageUploaderProps {
  onImageDrop?: (image: { src: string; width: number; height: number }, x: number, y: number) => void;
  canvasRef?: React.RefObject<HTMLElement | null>;
}

export const ImageUploader = ({ onImageDrop, canvasRef }: ImageUploaderProps) => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isSettling, setIsSettling] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          // Scale down large images
          const maxSize = 100;
          const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
          setImages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              src,
              width: img.width * ratio,
              height: img.height * ratio,
            },
          ]);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, image: ImageData) => {
    e.preventDefault();
    document.body.classList.add("dragging");
    setDragState({
      image,
      x: e.clientX,
      y: e.clientY,
      rotation: 0,
      scale: 1.05,
    });
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastPosRef.current.x;
      const speed = Math.abs(dx);
      const tilt = Math.min(speed * 0.4, 8);
      const rotation = dx !== 0 ? tilt * Math.sign(dx) : dragState.rotation * 0.9;

      setDragState((prev) =>
        prev ? { ...prev, x: e.clientX, y: e.clientY, rotation } : null
      );
      lastPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e: MouseEvent) => {
      document.body.classList.remove("dragging");

      if (canvasRef?.current && dragState) {
        const rect = canvasRef.current.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          onImageDrop?.(
            { src: dragState.image.src, width: dragState.image.width, height: dragState.image.height },
            x,
            y
          );
          setImages((prev) => prev.filter((img) => img.id !== dragState.image.id));
        } else {
          setIsSettling(dragState.image.id);
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
  }, [dragState, canvasRef, onImageDrop]);

  return (
    <>
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Images</h3>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
        >
          + Add Image
        </button>

        {images.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Drag images to canvas:</p>
            <div className="flex flex-wrap gap-2">
              {images.map((image) => (
                <div
                  key={image.id}
                  onMouseDown={(e) => handleMouseDown(e, image)}
                  className={`cursor-grab select-none rounded overflow-hidden shadow-sm hover:shadow-md transition-all ${
                    isSettling === image.id ? "animate-light-wobble" : ""
                  } ${dragState?.image.id === image.id ? "opacity-40" : ""}`}
                  style={{ width: 48, height: 48 }}
                >
                  <img
                    src={image.src}
                    alt=""
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
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
            className="fixed pointer-events-none z-50 rounded overflow-hidden"
            style={{
              left: dragState.x,
              top: dragState.y,
              width: dragState.image.width,
              height: dragState.image.height,
              transform: `translate(-50%, -50%) scale(${dragState.scale}) rotate(${dragState.rotation}deg)`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            }}
          >
            <img
              src={dragState.image.src}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>,
          document.body
        )}
    </>
  );
};
