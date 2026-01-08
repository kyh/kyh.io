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

export interface AxisLabels {
  xPositive: string;
  xNegative: string;
  yPositive: string;
  yNegative: string;
}

export interface QuadrantColors {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
}

export type GridType = "none" | "squares" | "dots";
export type LayoutType = "axis" | "edge";

export interface KwadrantState {
  tags: Tag[];
  images: CanvasImage[];
  axisLabels: AxisLabels;
  quadrantColors: QuadrantColors;
  gridType: GridType;
  layoutType: LayoutType;
}
