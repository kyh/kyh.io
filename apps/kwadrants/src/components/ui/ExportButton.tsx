import type { RefObject } from "react";
import type Konva from "konva";
import { downloadURI } from "@/lib/utils";

interface ExportButtonProps {
  stageRef: RefObject<Konva.Stage | null>;
}

export const ExportButton = ({ stageRef }: ExportButtonProps) => {
  const handleExport = (format: "png" | "jpeg") => {
    if (!stageRef.current) return;

    const dataURL = stageRef.current.toDataURL({
      mimeType: format === "jpeg" ? "image/jpeg" : "image/png",
      quality: 0.9,
      pixelRatio: 2,
    });

    downloadURI(dataURL, `kwadrant.${format}`);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-900">Export</h3>

      <div className="flex gap-2">
        <button
          onClick={() => handleExport("png")}
          className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          PNG
        </button>
        <button
          onClick={() => handleExport("jpeg")}
          className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          JPEG
        </button>
      </div>
    </div>
  );
};
