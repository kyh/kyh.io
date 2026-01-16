import type { LayoutConfig, LabelDefinition } from "./types";
import { layouts } from "./configs";

const layoutMap = new Map<string, LayoutConfig>(
  layouts.map((layout) => [layout.id, layout])
);

export const getLayout = (id: string): LayoutConfig => {
  const layout = layoutMap.get(id);
  if (!layout) throw new Error(`Unknown layout: ${id}`);
  return layout;
};

export const getAllLayouts = (): LayoutConfig[] => layouts;

export const getDefaultLabels = (layout: LayoutConfig): Record<string, string> =>
  Object.fromEntries(layout.labels.map((l: LabelDefinition) => [l.key, l.defaultText]));
