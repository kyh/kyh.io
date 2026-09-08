import type { LayoutConfig } from "./types";

const PADDING = 16;

export const axisLayout: LayoutConfig = {
  displayName: "Axis",
  getBounds: (w, h) => ({ height: h, width: w, x: 0, y: 0 }),
  id: "axis",
  labels: [
    {
      defaultText: "High",
      key: "xPositive",
      position: (b) => ({
        x: b.x + b.width - 80,
        y: b.y + b.height / 2 + PADDING,
      }),
    },
    {
      defaultText: "Low",
      key: "xNegative",
      position: (b) => ({ x: b.x + PADDING, y: b.y + b.height / 2 + PADDING }),
    },
    {
      defaultText: "High",
      key: "yPositive",
      position: (b) => ({ x: b.x + b.width / 2 + PADDING, y: b.y + PADDING }),
    },
    {
      defaultText: "Low",
      key: "yNegative",
      position: (b) => ({
        x: b.x + b.width / 2 + PADDING,
        y: b.y + b.height - PADDING - 14,
      }),
    },
  ],
  showOuterBorder: false,
};

export const edgeLayout: LayoutConfig = {
  displayName: "Edge",
  getBounds: (w, h) => ({ height: h - 70, width: w - 100, x: 80, y: 50 }),
  id: "edge",
  labels: [
    {
      defaultText: "X Axis",
      key: "horizontal",
      position: (b) => ({ x: b.x + b.width / 2, y: b.y - 25 }),
      textProps: { align: "center", fontStyle: "bold", offsetX: 30 },
    },
    {
      defaultText: "Y Axis",
      key: "vertical",
      position: (b) => ({ x: b.x - 25, y: b.y + b.height / 2 }),
      rotation: -90,
      textProps: { fontStyle: "bold", offsetY: -7 },
    },
  ],
  showOuterBorder: true,
};

export const layouts: LayoutConfig[] = [axisLayout, edgeLayout];
