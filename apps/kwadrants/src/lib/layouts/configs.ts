import type { LayoutConfig } from "./types";

const PADDING = 16;

export const axisLayout: LayoutConfig = {
  id: "axis",
  displayName: "Axis",
  getBounds: (w, h) => ({ x: 0, y: 0, width: w, height: h }),
  labels: [
    {
      key: "xPositive",
      defaultText: "High",
      position: (b) => ({ x: b.x + b.width - 80, y: b.y + b.height / 2 + PADDING }),
    },
    {
      key: "xNegative",
      defaultText: "Low",
      position: (b) => ({ x: b.x + PADDING, y: b.y + b.height / 2 + PADDING }),
    },
    {
      key: "yPositive",
      defaultText: "High",
      position: (b) => ({ x: b.x + b.width / 2 + PADDING, y: b.y + PADDING }),
    },
    {
      key: "yNegative",
      defaultText: "Low",
      position: (b) => ({ x: b.x + b.width / 2 + PADDING, y: b.y + b.height - PADDING - 14 }),
    },
  ],
  showOuterBorder: false,
};

export const edgeLayout: LayoutConfig = {
  id: "edge",
  displayName: "Edge",
  getBounds: (w, h) => ({ x: 80, y: 50, width: w - 100, height: h - 70 }),
  labels: [
    {
      key: "horizontal",
      defaultText: "X Axis",
      position: (b) => ({ x: b.x + b.width / 2, y: b.y - 25 }),
      textProps: { align: "center", fontStyle: "bold", offsetX: 30 },
    },
    {
      key: "vertical",
      defaultText: "Y Axis",
      position: (b) => ({ x: b.x - 25, y: b.y + b.height / 2 }),
      rotation: -90,
      textProps: { fontStyle: "bold", offsetY: -7 },
    },
  ],
  showOuterBorder: true,
};

export const layouts: LayoutConfig[] = [axisLayout, edgeLayout];
