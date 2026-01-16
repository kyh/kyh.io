export interface Tag {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

export interface CanvasImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LabelValues = Record<string, string>;
export type LayoutLabels = Record<string, LabelValues>;

export interface QuadrantColors {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
}

export type GridType = "none" | "squares" | "dots";
export type LayoutType = "axis" | "edge";
export type ThemeType = "light" | "dark";

export interface KwadrantState {
  tags: Tag[];
  images: CanvasImage[];
  layoutLabels: LayoutLabels;
  quadrantColors: QuadrantColors;
  gridType: GridType;
  layoutType: LayoutType;
  theme: ThemeType;
}
