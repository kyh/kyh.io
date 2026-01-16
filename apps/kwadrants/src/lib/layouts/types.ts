export interface MatrixBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LabelDefinition {
  key: string;
  defaultText: string;
  position: (bounds: MatrixBounds) => { x: number; y: number };
  rotation?: number;
  textProps?: {
    align?: "left" | "center" | "right";
    fontStyle?: "normal" | "bold";
    offsetX?: number;
    offsetY?: number;
  };
}

export interface LayoutConfig {
  id: string;
  displayName: string;
  getBounds: (width: number, height: number) => MatrixBounds;
  labels: LabelDefinition[];
  showOuterBorder: boolean;
}
