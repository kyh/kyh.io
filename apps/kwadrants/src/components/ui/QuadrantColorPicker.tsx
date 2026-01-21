import type { QuadrantColors } from "@/lib/types";
import { useKwadrant } from "@/lib/KwadrantContext";

const QUADRANT_LABELS: Record<keyof QuadrantColors, string> = {
  topLeft: "Top Left",
  topRight: "Top Right",
  bottomLeft: "Bottom Left",
  bottomRight: "Bottom Right",
};

export const QuadrantColorPicker = () => {
  const { state, setQuadrantColor } = useKwadrant();

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-900">Quadrant Colors</h3>

      <div className="grid grid-cols-2 gap-2">
        {(["topLeft", "topRight", "bottomLeft", "bottomRight"] as const).map(
          (quadrant) => (
            <div key={quadrant} className="flex items-center gap-2">
              <input
                type="color"
                value={state.quadrantColors[quadrant]}
                onChange={(e) => setQuadrantColor(quadrant, e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border border-gray-200"
              />
              <span className="text-xs text-gray-600">
                {QUADRANT_LABELS[quadrant]}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
};
